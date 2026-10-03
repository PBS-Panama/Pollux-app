import json
import base64
import urllib.error
import urllib.request
import urllib.parse
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.secret_store import get_secret


@dataclass
class OcrResult:
    text: str
    confidence: float  # 0.0 – 1.0
    blocks: List[str] = field(default_factory=list)
    # If set by a smart provider (Claude), skip _classify() and use this directly.
    verdict: Optional[dict] = None


class OcrProvider(ABC):
    @abstractmethod
    def extract(self, file_bytes: bytes, mime_type: str) -> OcrResult:
        ...


# Keyed by the exact titles used in CREW_ALL_DOCS so the mock produces
# realistic text for the default maritime document set.
_MOCK_TEXTS = {
    "Passport": (
        "PASSPORT REPÚBLICA DE PANAMÁ. Surname: Mendoza. Given Names: Carlos. "
        "Nationality: Panamanian. Date of Birth: 1985-07-22. Place of Birth: Panama City. "
        "Date of Issue: 2020-01-10. Date of Expiry: 2030-01-09. "
        "Document Number: PA-2020-001234."
    ),
    "Seaman's Book (Main Page)": (
        "LIBRO DE MARINERO / SEAMAN'S BOOK. República de Panamá. AMP-SEGUMAR. "
        "Nombre / Name: Carlos Mendoza. Libro No. / Book No.: PA-LM-2020-0042. "
        "Fecha de Emisión / Issue Date: 2020-02-15."
    ),
    "National ID Card": (
        "CÉDULA DE IDENTIDAD PERSONAL. República de Panamá. "
        "Tribunal Electoral. Nombre: Carlos A. Mendoza. "
        "Cédula: 8-888-8888. Fecha de Vencimiento: 2030-05-01."
    ),
    "Flag State CoC": (
        "CERTIFICATE OF COMPETENCY STCW II/2 Management Level. "
        "Panama Maritime Authority AMP. Certificate Number: PA-COC-2024-001234. "
        "This certifies that Carlos Mendoza has demonstrated competency in accordance "
        "with STCW Convention as amended. Valid until: 2030-03-15."
    ),
    "Flag State CoP": (
        "CERTIFICATE OF PROFICIENCY. STCW Endorsement. "
        "AMP Panama Maritime Authority. This document certifies completion of "
        "advanced training as required by STCW Convention. Certificate No: PA-COP-2024-5678. "
        "Valid until: 2029-06-30."
    ),
    "Medical Certificate": (
        "MEDICAL CERTIFICATE OF FITNESS FOR SEAFARERS. ILO/WHO Guidelines. "
        "This is to certify that Carlos Mendoza has been medically examined "
        "and is fit for service as a seafarer. Certificate No: MED-2023-0042. "
        "Issued: 2023-06-01. Valid Until: 2025-06-01."
    ),
    "default": (
        "CERTIFICATE. Maritime training certificate. This document certifies that "
        "the bearer has completed the required training and documentation in accordance "
        "with maritime regulations. Issued by the relevant maritime authority. "
        "Certificate No: CERT-2024-0001. Issue Date: 2024-01-01. Valid until: 2029-01-01."
    ),
}



# The mock text above is realistic enough to clear _classify()'s keyword match
# and land on status="probable_valid" — which used to be enough, on its own or
# combined with a missing doc_type_rules row, to auto-verify a document nobody
# actually read (Handover.md nota (42), L-4). Both mock providers below always
# carry a pre-computed verdict of status="error" so they can never reach
# doc_analyzer.py's auto-verify path, no matter what _classify() would have
# said about the canned text — this holds even if someone reactivates a mock
# provider in dev/staging without realizing what it does downstream.
_MOCK_VERDICT = {"status": "error", "confidence": 0.0, "flags": ["mock_provider"]}


class MockOcrProvider(OcrProvider):
    """Default provider — no credentials needed, returns canned text for demo.
    Never auto-verifies — see _MOCK_VERDICT above."""

    def extract(self, file_bytes: bytes, mime_type: str) -> OcrResult:
        text = _MOCK_TEXTS["default"]
        return OcrResult(text=text, confidence=0.82, blocks=[text], verdict=dict(_MOCK_VERDICT))


class _MockKeyedProvider(OcrProvider):
    """Internal — returns doc-key-specific mock text for realistic classification.
    Never auto-verifies — see _MOCK_VERDICT above."""

    def __init__(self, doc_key: str):
        self._doc_key = doc_key

    def extract(self, file_bytes: bytes, mime_type: str) -> OcrResult:
        text = _MOCK_TEXTS.get(self._doc_key, _MOCK_TEXTS["default"])
        return OcrResult(text=text, confidence=0.82, blocks=[text], verdict=dict(_MOCK_VERDICT))


class GoogleVisionProvider(OcrProvider):
    """Google Cloud Vision REST API — activated when GOOGLE_VISION_API_KEY is set."""

    _ENDPOINT = "https://vision.googleapis.com/v1/images:annotate"

    def __init__(self, api_key: str):
        self._key = api_key

    def extract(self, file_bytes: bytes, mime_type: str) -> OcrResult:
        b64 = base64.b64encode(file_bytes).decode("utf-8")
        payload = json.dumps({
            "requests": [{
                "image": {"content": b64},
                "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
            }]
        }).encode("utf-8")
        req = urllib.request.Request(
            f"{self._ENDPOINT}?key={urllib.parse.quote(self._key, safe='')}",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        full_text = ""
        confidence = 0.0
        blocks: List[str] = []
        responses = data.get("responses", [{}])
        if responses:
            ann = responses[0].get("fullTextAnnotation", {})
            full_text = ann.get("text", "")
            pages = ann.get("pages", [])
            if pages:
                confidence = sum(p.get("confidence", 0.0) for p in pages) / len(pages)
            blocks = [
                blk.get("text", "")
                for page in pages
                for blk in page.get("blocks", [])
                if blk.get("text")
            ]
        return OcrResult(text=full_text, confidence=confidence, blocks=blocks)


class ClaudeVisionProvider(OcrProvider):
    """Anthropic Claude Vision — activated when ANTHROPIC_API_KEY is set.
    Sends the uploaded image directly to claude-sonnet-4-6 for visual analysis.
    Returns a pre-computed ai_verdict in OcrResult.verdict — skips keyword _classify().
    Only handles image/* MIME types; PDFs are handled upstream by PdfTextProvider."""

    _SUPPORTED = {"image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"}
    MODEL = "claude-sonnet-4-6"

    def __init__(self, api_key: str, doc_key: str = "", expected_keywords: Optional[List[str]] = None,
                 feedback_examples: Optional[List[dict]] = None):
        self._api_key = api_key
        self._doc_key = doc_key
        self._expected_keywords = expected_keywords or []
        self._feedback_examples = feedback_examples or []

    def extract(self, file_bytes: bytes, mime_type: str) -> OcrResult:
        norm = (mime_type or "").lower().strip()

        # Non-image types: return empty result — PdfTextProvider handles PDFs upstream,
        # any remaining non-image will go through _classify() with empty text.
        if norm not in self._SUPPORTED:
            return OcrResult(text="", confidence=0.0, blocks=[])

        try:
            import anthropic  # imported at runtime to avoid hard dep at startup

            b64 = base64.b64encode(file_bytes).decode("utf-8")
            kw_list = ", ".join(self._expected_keywords) if self._expected_keywords else "(none configured)"

            # Build RAG context from human feedback history
            feedback_block = ""
            if self._feedback_examples:
                lines = []
                for ex in self._feedback_examples:
                    ai_s = ex.get("ai_status", "?")
                    human = ex.get("human_decision", "?")
                    reason = ex.get("rejection_reason") or ""
                    ai_id = ex.get("ai_identified_as") or ""
                    agreed = "✓ AI was correct" if ex.get("ai_correct") else "✗ AI was wrong"
                    line = f"  • AI said '{ai_s}'"
                    if ai_id:
                        line += f" (identified as: {ai_id})"
                    line += f" → admin {human}"
                    if reason:
                        line += f" — reason: \"{reason}\""
                    line += f"  [{agreed}]"
                    lines.append(line)
                feedback_block = (
                    f"\nPast human review decisions for this document type (learn from these patterns):\n"
                    + "\n".join(lines)
                    + "\n"
                )

            prompt = (
                f"You are a document verification AI for a maritime crew management platform.\n\n"
                f"The seafarer claims this document is: \"{self._doc_key}\"\n"
                f"Expected keywords/phrases for this document type: {kw_list}\n"
                f"{feedback_block}\n"
                f"Analyze the image carefully and respond with ONLY valid JSON — no markdown, no explanation:\n"
                f"{{\n"
                f"  \"status\": \"probable_valid\" | \"suspicious\" | \"likely_fake\" | \"wrong_document\",\n"
                f"  \"confidence\": <float 0.0-1.0>,\n"
                f"  \"flags\": [<short string flags, e.g. \"expiry_unclear\", \"poor_image_quality\">],\n"
                f"  \"identified_as\": \"<actual document type if NOT a {self._doc_key}, otherwise null>\"\n"
                f"}}\n\n"
                f"Status rules:\n"
                f"- probable_valid: document visually matches the claimed type and looks authentic\n"
                f"- suspicious: type might match but something is off (low quality, partial, unclear)\n"
                f"- likely_fake: visible signs of tampering, digital manipulation, or obvious forgery\n"
                f"- wrong_document: clearly a different type of document than claimed"
            )

            client = anthropic.Anthropic(api_key=self._api_key)
            response = client.messages.create(
                model=self.MODEL,
                max_tokens=512,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": norm if norm != "image/jpg" else "image/jpeg",
                                "data": b64,
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }],
            )

            raw = response.content[0].text.strip()
            # Strip markdown code fences if the model added them
            if raw.startswith("```"):
                parts = raw.split("```")
                raw = parts[1] if len(parts) > 1 else raw
                if raw.startswith("json"):
                    raw = raw[4:]

            verdict = json.loads(raw.strip())
            verdict.setdefault("status", "suspicious")
            verdict.setdefault("confidence", 0.5)
            verdict.setdefault("flags", [])
            if "identified_as" not in verdict:
                verdict["identified_as"] = None

            # Clean up null identified_as
            if verdict.get("identified_as") in (None, "null", ""):
                verdict.pop("identified_as", None)

            return OcrResult(
                text=f"[Claude Vision] {self._doc_key} → {verdict['status']}",
                confidence=float(verdict["confidence"]),
                blocks=[],
                verdict=verdict,
            )

        except Exception as exc:
            return OcrResult(
                text="",
                confidence=0.0,
                blocks=[],
                verdict={
                    "status": "error",
                    "confidence": 0.0,
                    "flags": [f"claude_error:{str(exc)[:150]}"],
                },
            )


class PdfTextProvider(OcrProvider):
    """Extracts embedded text from digitally-created PDFs using pypdf (pure Python, no API key).
    Falls back to the wrapped provider for scanned/image-only PDFs or non-PDF files."""

    def __init__(self, fallback: OcrProvider):
        self._fallback = fallback

    def extract(self, file_bytes: bytes, mime_type: str) -> OcrResult:
        if "pdf" not in (mime_type or "").lower():
            return self._fallback.extract(file_bytes, mime_type)
        try:
            from pypdf import PdfReader
            from io import BytesIO
            # Some files have garbage bytes before %PDF header (observed in H2S certs)
            pdf_start = file_bytes.find(b"%PDF")
            data = file_bytes[pdf_start:] if pdf_start > 0 else file_bytes
            reader = PdfReader(BytesIO(data), strict=False)
            pages_text = [page.extract_text() or "" for page in reader.pages]
            full_text = "\n".join(t for t in pages_text if t).strip()
            if full_text:
                return OcrResult(text=full_text, confidence=0.92, blocks=pages_text)
        except Exception:
            pass
        # No embedded text (scanned PDF) — use fallback
        return self._fallback.extract(file_bytes, mime_type)


# Key resolution (DB-first, env fallback) and the admin "Probar" button both
# moved to app/services/secret_store.py + app/routers/admin.py (T13,
# 2026-10-03) — same contract Castor ships (Handover.md nota 136), replacing
# this file's own _read_key_from_db()/check_api_key()/_probe_*() from
# 2026-10-02. get_secret() is the one resolver now, used here and by
# google_drive.py for GOOGLE_DRIVE_CLIENT_SECRET.


def get_ocr_provider(doc_key: str = "", rules_context: Optional[dict] = None,
                     feedback_examples: Optional[List[dict]] = None,
                     db: Optional[Session] = None) -> OcrProvider:
    """Factory — returns the best available provider for the environment.
    Priority: ClaudeVisionProvider (ANTHROPIC_API_KEY) > GoogleVisionProvider > Keyed/Generic Mock.
    Always wrapped in PdfTextProvider for digital PDF text extraction.
    feedback_examples: recent human decisions for this doc_key, injected into Claude's prompt (RAG).
    db: optional session — when given, checks api_key_config (Handover.md nota
    48) before falling back to the env var. Callers with no DB session handy
    (tests, scripts) keep working on the env var alone."""
    anthropic_key = get_secret("ANTHROPIC_API_KEY", db)
    google_key = get_secret("GOOGLE_VISION_API_KEY", db)
    expected_keywords = (rules_context or {}).get("expected_keywords", [])

    if not anthropic_key and not google_key and settings.is_production:
        # Falling back to the mock provider in production used to mean a document
        # nobody read could reach verification_status='verified' with zero log
        # output — a misconfigured env var in Cloud Run failed silently. This is
        # the loud version of that failure (Handover.md nota (42), L-4).
        raise RuntimeError(
            "get_ocr_provider(): ENVIRONMENT=production but neither ANTHROPIC_API_KEY "
            "nor GOOGLE_VISION_API_KEY is set — refusing to fall back to the mock "
            "OCR provider in production."
        )

    base: OcrProvider = (
        ClaudeVisionProvider(anthropic_key, doc_key, expected_keywords, feedback_examples or []) if anthropic_key
        else GoogleVisionProvider(google_key) if google_key
        else (_MockKeyedProvider(doc_key) if doc_key else MockOcrProvider())
    )
    return PdfTextProvider(fallback=base)
