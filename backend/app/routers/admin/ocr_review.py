"""Admin API — OCR pending-review queue, document file proxy, OCR feedback log.

Split out of the former single-file routers/admin.py (T18): code moved verbatim,
only the imports were pruned per module. Routes are aggregated in admin/__init__.py.
"""

import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.deps import require_admin
from app.services.castor_files import CastorFetchError, fetch_castor_file
from app.models.user import User

router = APIRouter()

# ─── Module — OCR Pending Review Queue (Obj.3) ──────────────────────────────

@router.get("/documents/pending-review")
def pending_review_queue(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    mode: str = Query("active", description="active | audit"),
):
    """
    active (default): cases awaiting admin decision.
    audit: all cases admin has already decided (verified/rejected by admin).
    """
    offset = (page - 1) * limit

    if mode == "audit":
        # Decided by admin: verified_by is set AND final status is settled
        where = """
            WHERE d.verified_by IS NOT NULL
              AND d.verification_status IN ('verified', 'rejected')
              AND (
                  d.verification_status IN ('under_review', 'wrong_document')
                  OR (d.ai_verdict->>'status') IN ('suspicious', 'likely_fake', 'wrong_document')
                  OR d.verified_by IS NOT NULL
              )
        """
    else:
        # Active: seafarer explicitly requested human review (verification_status = under_review)
        # Docs with AI rejection that the user has NOT appealed yet do NOT appear here.
        where = """
            WHERE d.verification_status = 'under_review'
        """

    rows = db.execute(text(f"""
        SELECT d.id, d.name, d.doc_key, d.seafarer_id, d.verification_status,
               d.ai_verdict, d.uploaded_at, d.saved_name, d.mime_type,
               d.rejection_reason, d.verified_at,
               s.first_name, s.last_name, u.seafarer_code
        FROM documents d
        JOIN users u ON u.id = d.seafarer_id
        LEFT JOIN seafarers s ON s.id = d.seafarer_id
        {where}
        ORDER BY d.uploaded_at DESC
        LIMIT :limit OFFSET :offset
    """), {"limit": limit, "offset": offset}).fetchall()

    total = db.execute(text(f"""
        SELECT COUNT(*) FROM documents d {where}
    """)).scalar()

    return {
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
        "mode": mode,
        "items": [
            {
                "id": r.id,
                "name": r.name,
                "docKey": r.doc_key,
                "seafarerId": r.seafarer_id,
                "seafarerCode": r.seafarer_code,
                "firstName": r.first_name,
                "lastName": r.last_name,
                "verificationStatus": r.verification_status,
                "aiVerdict": r.ai_verdict,
                "uploadedAt": r.uploaded_at.isoformat() if r.uploaded_at else None,
                "savedName": r.saved_name,
                "mimeType": r.mime_type,
                "rejectionReason": r.rejection_reason,
                "verifiedAt": r.verified_at.isoformat() if r.verified_at else None,
            }
            for r in rows
        ],
    }


@router.get("/documents/{doc_id}/file")
def admin_get_document_file(
    doc_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Proxy the raw document file from castor storage so the admin browser can render it inline."""
    from fastapi.responses import Response as _Response

    row = db.execute(text("""
        SELECT seafarer_id, saved_name, mime_type FROM documents WHERE id = :id
    """), {"id": doc_id}).fetchone()
    if not row or not row.saved_name:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        content, fetched_type = fetch_castor_file(row.seafarer_id, row.saved_name, service="pollux-admin-proxy")
    except CastorFetchError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    content_type = row.mime_type or fetched_type

    return _Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f"inline; filename={row.saved_name}"},
    )


class AdminVerdictPayload(BaseModel):
    verification_status: str   # "verified" | "rejected" | "pending"
    rejection_reason: Optional[str] = None


@router.patch("/documents/{doc_id}/verdict")
def admin_set_verdict(
    doc_id: str,
    payload: AdminVerdictPayload,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin manual override: set verified / rejected / pending on any document."""
    allowed = {"verified", "rejected", "pending", "under_review"}
    if payload.verification_status not in allowed:
        raise HTTPException(status_code=422, detail=f"status must be one of {allowed}")
    result = db.execute(text("""
        UPDATE documents
        SET verification_status = :vs,
            rejection_reason = :reason,
            verified_by = :admin_id,
            verified_at = NOW()
        WHERE id = :id
        RETURNING id
    """), {
        "vs": payload.verification_status,
        "reason": payload.rejection_reason,
        "admin_id": str(admin.id),
        "id": doc_id,
    }).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Document not found")
    db.commit()

    # ── OCR Feedback Loop: log this human decision for RAG learning ──────────
    try:
        doc_row = db.execute(text("""
            SELECT doc_key, name, seafarer_id, ai_verdict FROM documents WHERE id = :id
        """), {"id": doc_id}).fetchone()
        if doc_row:
            av = doc_row.ai_verdict or {}
            ai_status = av.get("status")
            # ai_correct = AI and human agreed on the outcome
            ai_correct: bool | None = None
            if ai_status:
                if ai_status in ("probable_valid", "verified"):
                    ai_correct = payload.verification_status == "verified"
                elif ai_status in ("suspicious", "likely_fake", "wrong_document"):
                    ai_correct = payload.verification_status == "rejected"
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
                "human": payload.verification_status,
                "reason": payload.rejection_reason,
                "correct": ai_correct,
                "admin_id": str(admin.id),
            })
            db.commit()
    except Exception:
        pass  # Never block the verdict response due to logging failure

    return {"ok": True, "docId": doc_id, "verificationStatus": payload.verification_status}


# ─── OCR Feedback Log ────────────────────────────────────────────────────────

@router.get("/ocr-feedback")
def get_ocr_feedback(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    doc_key: str = Query(""),
):
    """Return OCR feedback log + per-doc_key agreement stats."""
    where = ["1=1"]
    params: dict = {}
    if doc_key:
        where.append("doc_key = :doc_key")
        params["doc_key"] = doc_key

    where_sql = " AND ".join(where)
    offset = (page - 1) * limit
    params.update({"limit": limit, "offset": offset})

    rows = db.execute(text(f"""
        SELECT id, document_id, doc_key, doc_name, seafarer_id,
               ai_status, ai_confidence, ai_flags, ai_identified_as,
               human_decision, rejection_reason, ai_correct, admin_id, created_at
        FROM ocr_feedback_log
        WHERE {where_sql}
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()

    total = db.execute(text(f"SELECT COUNT(*) FROM ocr_feedback_log WHERE {where_sql}"),
                       {k: v for k, v in params.items() if k not in ("limit", "offset")}).scalar()

    # Aggregate stats per doc_key
    stats_rows = db.execute(text("""
        SELECT doc_key,
               COUNT(*)                                          AS total,
               SUM(CASE WHEN ai_correct = TRUE  THEN 1 ELSE 0 END) AS correct,
               SUM(CASE WHEN ai_correct = FALSE THEN 1 ELSE 0 END) AS wrong,
               SUM(CASE WHEN human_decision = 'verified' THEN 1 ELSE 0 END) AS approved,
               SUM(CASE WHEN human_decision = 'rejected' THEN 1 ELSE 0 END) AS rejected
        FROM ocr_feedback_log
        GROUP BY doc_key
        ORDER BY total DESC
    """)).fetchall()

    return {
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
        "items": [
            {
                "id": str(r.id),
                "documentId": str(r.document_id),
                "docKey": r.doc_key,
                "docName": r.doc_name,
                "seafarerId": r.seafarer_id,
                "aiStatus": r.ai_status,
                "aiConfidence": r.ai_confidence,
                "aiFlags": r.ai_flags or [],
                "aiIdentifiedAs": r.ai_identified_as,
                "humanDecision": r.human_decision,
                "rejectionReason": r.rejection_reason,
                "aiCorrect": r.ai_correct,
                "adminId": r.admin_id,
                "createdAt": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
        "stats": [
            {
                "docKey": s.doc_key,
                "total": s.total,
                "correct": s.correct or 0,
                "wrong": s.wrong or 0,
                "approved": s.approved or 0,
                "rejected": s.rejected or 0,
                "agreementRate": round((s.correct or 0) / s.total * 100, 1) if s.total else None,
            }
            for s in stats_rows
        ],
    }
