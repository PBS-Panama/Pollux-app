"""Admin API — OCR reference files.

Split out of the former single-file routers/admin.py (T18): code moved verbatim,
only the imports were pruned per module. Routes are aggregated in admin/__init__.py.
"""

from typing import Optional
from fastapi.concurrency import run_in_threadpool
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.deps import require_admin
from app.models.user import User

router = APIRouter()

# ─── Module — OCR Reference Files (Obj.3) ───────────────────────────────────

import pathlib as _pathlib
import re as _re
from collections import Counter as _Counter

_OCR_REF_DIR = _pathlib.Path("/app/ocr_references")


def _safe_key(raw: str) -> str:
    """Sanitize doc_key to a safe directory name. Removes only path traversal and null bytes."""
    s = raw.strip().replace("..", "").replace("/", "_").replace("\\", "_").replace("\x00", "")
    return s.strip() or "unknown"


@router.get("/ocr-references")
def list_ocr_references(admin: User = Depends(require_admin)):
    """List all uploaded OCR reference files, grouped by doc_key folder name."""
    result: dict = {}
    if _OCR_REF_DIR.exists():
        for doc_dir in sorted(_OCR_REF_DIR.iterdir()):
            if doc_dir.is_dir():
                files = [
                    {"name": f.name, "size": f.stat().st_size}
                    for f in sorted(doc_dir.iterdir())
                    if f.is_file() and not f.name.startswith(".")
                ]
                result[doc_dir.name] = files
    return result


@router.post("/ocr-references/{doc_key:path}", status_code=201)
async def upload_ocr_reference(
    doc_key: str,
    file: UploadFile = File(...),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Upload a PDF/image reference file for a doc_key.
    Runs OCR extraction and returns the extracted text + suggested keywords."""
    from app.services.ocr_provider import get_ocr_provider

    target_dir = _OCR_REF_DIR / _safe_key(doc_key)
    target_dir.mkdir(parents=True, exist_ok=True)

    file_bytes = await file.read()
    safe_name = _pathlib.Path(file.filename or "reference.pdf").name
    (target_dir / safe_name).write_bytes(file_bytes)

    mime = file.content_type or "application/octet-stream"
    # Sync OCR (network call to the provider) must not run on the event loop:
    # it would freeze the single uvicorn worker for every other request.
    ocr = await run_in_threadpool(lambda: get_ocr_provider(doc_key, db=db).extract(file_bytes, mime))
    text = ocr.text or ""

    # Suggest keywords from OCR text: frequent single words + 2-grams
    STOPWORDS = {
        "that", "this", "with", "have", "from", "they", "will", "been", "were",
        "said", "each", "which", "their", "time", "when", "there", "more", "also",
        "than", "then", "some", "what", "other", "into", "about", "over", "after",
        "only", "those", "these", "very", "just", "date", "name", "hereby",
        "herein", "para", "este", "esta", "como", "pero", "donde", "cuando",
        "tiene", "puede", "desde", "hasta", "hacer", "certif", "page",
    }
    words = _re.findall(r"[a-záéíóúñüA-ZÁÉÍÓÚÑÜ]{4,}", text.lower())
    freq = _Counter(w for w in words if w not in STOPWORDS)
    pairs = [
        f"{words[i]} {words[i + 1]}"
        for i in range(len(words) - 1)
        if words[i] not in STOPWORDS and words[i + 1] not in STOPWORDS
    ]
    pair_freq = _Counter(pairs)

    suggested: list = []
    seen: set = set()
    for phrase, cnt in pair_freq.most_common(12):
        if cnt >= 2 and phrase not in seen:
            suggested.append(phrase)
            seen.add(phrase)
    for word, cnt in freq.most_common(15):
        if cnt >= 2 and word not in seen and len(suggested) < 20:
            suggested.append(word)
            seen.add(word)

    return {
        "ok": True,
        "fileName": safe_name,
        "ocrText": text[:4000],
        "ocrConfidence": round(ocr.confidence, 3),
        "suggestedKeywords": suggested[:20],
    }


@router.delete("/ocr-references/{doc_key:path}", status_code=204)
def delete_ocr_reference(
    doc_key: str,
    filename: str = Query(..., description="Filename to delete within the doc_key folder"),
    admin: User = Depends(require_admin),
):
    """Delete a single reference file from a doc_key folder."""
    safe_name = _pathlib.Path(filename).name
    target = _OCR_REF_DIR / _safe_key(doc_key) / safe_name
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    target.unlink()


@router.get("/ocr-reference-file")
def serve_ocr_reference_file(
    doc_key: str = Query(...),
    filename: str = Query(...),
    admin: User = Depends(require_admin),
):
    """Serve a single reference file inline for the admin file viewer."""
    import mimetypes
    from fastapi.responses import FileResponse

    safe_name = _pathlib.Path(filename).name
    target = _OCR_REF_DIR / _safe_key(doc_key) / safe_name
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    mime, _ = mimetypes.guess_type(safe_name)
    mime = mime or "application/octet-stream"
    return FileResponse(
        str(target),
        media_type=mime,
        headers={"Content-Disposition": f"inline; filename=\"{safe_name}\""},
    )


@router.get("/alerts")
def list_alerts(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    level: Optional[str] = Query(None),
):
    """Admin-only — view the last N alert log entries."""
    where = "WHERE 1=1"
    params: dict = {"limit": limit}
    if level:
        where += " AND level = :level"
        params["level"] = level
    rows = db.execute(text(f"""
        SELECT id, level, source, message, context, created_at
        FROM admin_alerts {where}
        ORDER BY created_at DESC
        LIMIT :limit
    """), params).fetchall()
    return [
        {
            "id": r.id,
            "level": r.level,
            "source": r.source,
            "message": r.message,
            "context": r.context,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
