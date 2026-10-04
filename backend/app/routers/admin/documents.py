"""Admin API — Document verification queue.

Split out of the former single-file routers/admin.py (T18): code moved verbatim,
only the imports were pruned per module. Routes are aggregated in admin/__init__.py.
"""

import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.deps import require_admin
from app.models.user import User

router = APIRouter()

# ─── Module 2 — Document Verification Queue ─────────────────────────────────

@router.get("/documents")
def list_documents_queue(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    vstatus: str = Query("pending"),   # pending | under_review | verified | rejected | all
    search: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
):
    where = ["1=1"]
    params: dict = {}

    if vstatus != "all":
        where.append("(d.verification_status = :vs OR (:vs = 'pending' AND d.verification_status IS NULL))")
        params["vs"] = vstatus
    if search:
        where.append("(s.first_name ILIKE :search OR s.last_name ILIKE :search OR d.name ILIKE :search)")
        params["search"] = f"%{search}%"

    where_sql = " AND ".join(where)
    offset = (page - 1) * limit
    params.update({"limit": limit, "offset": offset})

    rows = db.execute(text(f"""
        SELECT d.id, d.name, d.cert_code, d.doc_key, d.file_path,
               d.issued_date, d.expiry_date, d.status,
               d.verification_status, d.rejection_reason, d.verified_at, d.uploaded_at,
               s.id as seafarer_id, s.first_name, s.last_name, s.rank, s.fleet_category
        FROM documents d
        JOIN seafarers s ON s.id = d.seafarer_id
        WHERE {where_sql}
        ORDER BY d.uploaded_at ASC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()

    total = db.execute(text(f"""
        SELECT COUNT(*) FROM documents d
        JOIN seafarers s ON s.id = d.seafarer_id
        WHERE {where_sql}
    """), {k: v for k, v in params.items() if k not in ("limit", "offset")}).scalar()

    return {
        "total": total, "page": page, "pages": max(1, -(-total // limit)),
        "items": [
            {
                "id": r.id, "name": r.name, "cert_code": r.cert_code,
                "doc_key": r.doc_key, "file_path": r.file_path,
                "issued_date": r.issued_date.isoformat() if r.issued_date else None,
                "expiry_date": r.expiry_date.isoformat() if r.expiry_date else None,
                "status": r.status,
                "verification_status": r.verification_status or "pending",
                "rejection_reason": r.rejection_reason,
                "verified_at": r.verified_at.isoformat() if r.verified_at else None,
                "uploaded_at": r.uploaded_at.isoformat() if r.uploaded_at else None,
                "seafarer_id": r.seafarer_id,
                "seafarer_name": f"{r.first_name or ''} {r.last_name or ''}".strip(),
                "seafarer_rank": r.rank,
                "seafarer_fleet": r.fleet_category,
            }
            for r in rows
        ],
    }


class VerifyPayload(BaseModel):
    action: str          # verified | rejected | under_review
    reason: Optional[str] = None


@router.patch("/documents/{doc_id}/verify")
def verify_document(
    doc_id: str,
    payload: VerifyPayload,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if payload.action not in ("verified", "rejected", "under_review"):
        raise HTTPException(status_code=400, detail="action must be verified | rejected | under_review")

    now = datetime.now(timezone.utc)
    result = db.execute(text("""
        UPDATE documents
        SET verification_status = :vs,
            verified_by = :by,
            verified_at = :at,
            rejection_reason = :reason,
            updated_at = :at
        WHERE id = :id
        RETURNING id
    """), {
        "vs": payload.action,
        "by": admin.id,
        "at": now if payload.action == "verified" else None,
        "reason": payload.reason if payload.action == "rejected" else None,
        "id": doc_id,
    }).fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="Document not found")
    db.commit()

    # ── OCR Feedback Loop: log final decisions from Documents panel ──────────
    if payload.action in ("verified", "rejected"):
        try:
            doc_row = db.execute(text("""
                SELECT doc_key, name, seafarer_id, ai_verdict FROM documents WHERE id = :id
            """), {"id": doc_id}).fetchone()
            if doc_row:
                av = doc_row.ai_verdict or {}
                ai_status = av.get("status")
                ai_correct: bool | None = None
                if ai_status:
                    if ai_status in ("probable_valid", "verified"):
                        ai_correct = payload.action == "verified"
                    elif ai_status in ("suspicious", "likely_fake", "wrong_document"):
                        ai_correct = payload.action == "rejected"
                db.execute(text("""
                    INSERT INTO ocr_feedback_log
                        (document_id, doc_key, doc_name, seafarer_id,
                         ai_status, ai_confidence, ai_flags, ai_identified_as,
                         human_decision, rejection_reason, ai_correct, admin_id)
                    VALUES
                        (:doc_id, :doc_key, :doc_name, :seafarer_id,
                         :ai_status, :ai_conf, CAST(:ai_flags AS jsonb), :ai_id_as,
                         :human, :reason, :correct, :admin_id)
                """), {
                    "doc_id": doc_id,
                    "doc_key": doc_row.doc_key,
                    "doc_name": doc_row.name,
                    "seafarer_id": str(doc_row.seafarer_id) if doc_row.seafarer_id else None,
                    "ai_status": ai_status,
                    "ai_conf": av.get("confidence"),
                    "ai_flags": json.dumps(av.get("flags", [])),
                    "ai_id_as": av.get("identified_as"),
                    "human": payload.action,
                    "reason": payload.reason if payload.action == "rejected" else None,
                    "correct": ai_correct,
                    "admin_id": str(admin.id),
                })
                db.commit()
        except Exception:
            pass  # Never block the verify response due to logging failure

    return {"id": doc_id, "verification_status": payload.action}
