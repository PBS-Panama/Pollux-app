"""
Obj.3 — OCR Doc Analyzer
BackgroundTask pipeline: fetch file → OCR extract → classify → persist ai_verdict.

Entry point:  analyze_document_background(doc_id, user_id, saved_name, mime_type, doc_key)
Called from:  documents.py sync endpoint via FastAPI BackgroundTasks
              and the manual re-trigger POST endpoint.
"""

import re
import json
import urllib.request
import urllib.parse
from sqlalchemy import text

from app.core.config import settings
from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.services.ocr_provider import get_ocr_provider

CASTOR_BASE = settings.CASTOR_BASE_URL


def _fetch_file(user_id: str, saved_name: str) -> bytes:
    encoded = urllib.parse.quote(saved_name, safe="")
    url = f"{CASTOR_BASE}/api/users/{user_id}/myfiles/download/{encoded}"
    # Runs as a background task on behalf of the platform (OCR pipeline), not
    # a live request from user_id — an explicit service marker, not a
    # disguised admin user (see company.py's _fetch_castor_file for why).
    token = create_access_token({"sub": "pollux-ocr-proxy", "svc": True})
    req = urllib.request.Request(url, method="GET", headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def _get_rules(doc_key: str, db):
    if not doc_key:
        return None
    row = db.execute(text("""
        SELECT expected_keywords, red_flag_keywords,
               min_confidence, auto_verify_threshold, number_regex
        FROM doc_type_rules WHERE doc_key = :dk
    """), {"dk": doc_key}).fetchone()
    if row is None and doc_key.startswith("IMO "):
        row = db.execute(text("""
            SELECT expected_keywords, red_flag_keywords,
                   min_confidence, auto_verify_threshold, number_regex
            FROM doc_type_rules WHERE doc_key = '_IMO_COURSE_GENERIC'
        """)).fetchone()
    return row


def _identify_document(extracted_text: str, db) -> str | None:
    """Cross-match OCR text against all known doc_type_rules to identify the actual document type."""
    rows = db.execute(text(
        "SELECT doc_key, expected_keywords FROM doc_type_rules"
    )).fetchall()
    text_lower = extracted_text.lower()
    best_key = None
    best_ratio = 0.0
    for row in rows:
        keywords = row.expected_keywords or []
        if not keywords:
            continue
        found = sum(1 for kw in keywords if kw.lower() in text_lower)
        ratio = found / len(keywords)
        if ratio > best_ratio:
            best_ratio = ratio
            best_key = row.doc_key
    return best_key if best_ratio >= 0.3 else None


def _classify(extracted_text: str, ocr_confidence: float, rules) -> dict:
    if not rules:
        # No rules configured — default to probable_valid, pass through OCR confidence
        return {"status": "probable_valid", "confidence": round(ocr_confidence, 3), "flags": []}

    text_lower = extracted_text.lower()
    flags: list = []

    expected     = rules.expected_keywords or []
    red_flags    = rules.red_flag_keywords or []
    min_conf     = float(rules.min_confidence or 0.5)
    number_regex = rules.number_regex

    # Check red-flag keywords first
    red_found = [kw for kw in red_flags if kw.lower() in text_lower]
    if red_found:
        flags.extend([f"red_flag:{kw}" for kw in red_found])

    # Fraction of expected keywords found
    expected_found = sum(1 for kw in expected if kw.lower() in text_lower)
    keyword_ratio  = expected_found / max(len(expected), 1) if expected else 1.0

    # Optional: check document number pattern
    if number_regex:
        try:
            if not re.search(number_regex, extracted_text, re.IGNORECASE):
                flags.append("number_not_found")
        except re.error:
            flags.append("invalid_number_regex")

    # Determine status and weighted confidence
    if red_found:
        status     = "likely_fake" if len(red_found) >= 2 else "suspicious"
        confidence = ocr_confidence * 0.3
    elif ocr_confidence < min_conf:
        status = "suspicious"
        flags.append(f"low_ocr_confidence:{ocr_confidence:.2f}")
        confidence = ocr_confidence * keyword_ratio
    elif keyword_ratio < 0.3:
        status = "wrong_document"
        flags.append(f"keyword_match:{expected_found}/{len(expected)}")
        confidence = ocr_confidence * keyword_ratio
    elif keyword_ratio < 0.6:
        status = "suspicious"
        flags.append(f"keyword_match:{expected_found}/{len(expected)}")
        confidence = ocr_confidence * keyword_ratio
    else:
        status     = "probable_valid"
        confidence = ocr_confidence * keyword_ratio

    return {"status": status, "confidence": round(confidence, 3), "flags": flags}


def _decide_verification_status(verdict: dict, rules) -> str | None:
    """Whether an OCR verdict should promote verification_status to 'verified'.

    ONLY auto-approves high-confidence valid verdicts. Rejections (suspicious,
    likely_fake, wrong_document) and errors — including the mock provider's
    always-status="error" verdict, see ocr_provider.py — never auto-escalate;
    the seafarer sees the AI rejection first and can manually appeal.

    Extracted out of analyze_document_background() so it's testable without a
    DB session (Handover.md nota (42), L-4 — see test_ocr_mock_guard.py).
    """
    if rules:
        auto_thresh = float(rules.auto_verify_threshold or 0.9)
        if verdict["status"] == "probable_valid" and verdict["confidence"] >= auto_thresh:
            return "verified"
        return None
    # No rules configured — auto-approve probable_valid only
    if verdict["status"] == "probable_valid":
        return "verified"
    return None


def _set_verdict(db, doc_id: str, verdict: dict, verification_status: str | None = None) -> None:
    if verification_status:
        db.execute(text("""
            UPDATE documents
            SET ai_verdict = :v, verification_status = :vs
            WHERE id = :id
        """), {"v": json.dumps(verdict), "vs": verification_status, "id": doc_id})
    else:
        db.execute(text(
            "UPDATE documents SET ai_verdict = :v WHERE id = :id"
        ), {"v": json.dumps(verdict), "id": doc_id})
    db.commit()


def analyze_document_background(
    doc_id: str,
    user_id: str,
    saved_name: str,
    mime_type: str,
    doc_key: str,
) -> None:
    """
    Run OCR analysis for a document in the background.
    Creates its own DB session (BackgroundTask runs after the request is closed).
    """
    db = SessionLocal()
    try:
        # Mark as in-progress so the UI can show a spinner
        _set_verdict(db, doc_id, {"status": "analyzing", "confidence": 0, "flags": []})

        # 1 — Fetch physical file from castor Express
        try:
            file_bytes = _fetch_file(user_id, saved_name)
        except Exception as exc:
            # Recorded in ai_verdict (visible via the document's own record),
            # but that's easy to miss from Cloud Run's log viewer — print too,
            # same reasoning as company.py's _fetch_castor_file.
            status = getattr(exc, "code", None)
            print(f"[doc_analyzer] fetch failed status={status} doc_id={doc_id} user_id={user_id}: {exc}", flush=True)
            _set_verdict(db, doc_id, {
                "status": "error", "confidence": 0,
                "flags": [f"fetch_error:{str(exc)[:120]}"],
            })
            return

        # 2 — Load classification rules first (passed as context to the provider)
        rules = _get_rules(doc_key, db)
        rules_context = {
            "expected_keywords": list(rules.expected_keywords or []) if rules else []
        }

        # 2b — Query feedback log for RAG context (last 8 human decisions for this doc_key)
        feedback_examples = []
        if doc_key:
            try:
                fb_rows = db.execute(text("""
                    SELECT ai_status, ai_identified_as, human_decision, rejection_reason, ai_correct
                    FROM ocr_feedback_log
                    WHERE doc_key = :dk
                    ORDER BY created_at DESC
                    LIMIT 8
                """), {"dk": doc_key}).fetchall()
                feedback_examples = [
                    {
                        "ai_status": r.ai_status,
                        "ai_identified_as": r.ai_identified_as,
                        "human_decision": r.human_decision,
                        "rejection_reason": r.rejection_reason,
                        "ai_correct": r.ai_correct,
                    }
                    for r in fb_rows
                ]
            except Exception:
                pass  # Table may not exist on first boot — safe to skip

        # 3 — Run OCR / AI analysis
        # get_ocr_provider() can raise (L-4's RuntimeError when no key is
        # configured, among others) — without this try/except that exception
        # left this function with no matching `except`, so it propagated out
        # of the BackgroundTask and _set_verdict() was never called again:
        # the document stayed on the "analyzing" marker set at the top of
        # this function forever, indistinguishable from "still working"
        # (Handover.md nota (50) del dev de Castor — found live, doc_key
        # never resolved). The other two failure points in this function
        # already had this same pattern; this was the one missing.
        try:
            provider = get_ocr_provider(doc_key or "", rules_context, feedback_examples, db=db)
        except Exception as exc:
            _set_verdict(db, doc_id, {
                "status": "error", "confidence": 0,
                "flags": [f"provider_error:{str(exc)[:120]}"],
            })
            return
        try:
            ocr_result = provider.extract(file_bytes, mime_type or "application/pdf")
        except Exception as exc:
            _set_verdict(db, doc_id, {
                "status": "error", "confidence": 0,
                "flags": [f"ocr_error:{str(exc)[:120]}"],
            })
            return

        # 4 — Classify: use provider's pre-computed verdict (Claude) or keyword match
        if ocr_result.verdict is not None:
            verdict = ocr_result.verdict
        else:
            verdict = _classify(ocr_result.text, ocr_result.confidence, rules)
            # For keyword-based wrong_document, try to identify what the file actually is
            if verdict["status"] == "wrong_document":
                identified = _identify_document(ocr_result.text, db)
                if identified:
                    verdict["identified_as"] = identified

        # 5 — Determine if verification_status should be promoted
        new_vs = _decide_verification_status(verdict, rules)
        _set_verdict(db, doc_id, verdict, new_vs)

    finally:
        db.close()
