import uuid
import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentResponse
from app.services.codename import build_codename
from app.services.doc_analyzer import analyze_document_background

router = APIRouter()


# The three routes below take a foreign `seafarer_id` and never checked it
# against the caller (Handover.md nota 42, L-1/L-2) — any logged-in account
# could read, insert into, or delete another seafarer's document record.
# Verified against the real call chain (frontend `src/`, both admin panels),
# not a grep: none of the three has a legitimate caller — self-service already
# has its own gated siblings (`/seafarer/me/documents*` below), and the admin
# panel never calls these either — `admin.py`'s seafarer-detail and
# delete-seafarer endpoints run their own inline SQL instead of reusing them.
# So the fix is not "self OR admin" (self was never a real caller here) — it's
# `require_admin`, same as admin.py's own routes, which is strictly less
# surface than adding a self-guard nobody needs.
@router.get("/users/{seafarer_id}/documents", response_model=List[DocumentResponse])
def list_documents(
    seafarer_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    docs = db.query(Document).filter(Document.seafarer_id == seafarer_id).all()
    return docs


@router.post("/users/{seafarer_id}/documents", response_model=DocumentResponse, status_code=201)
def create_document(
    seafarer_id: str,
    payload: DocumentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    doc = Document(
        seafarer_id=seafarer_id,
        name=payload.name,
        cert_code=payload.cert_code,
        doc_key=payload.doc_key,
        issued_date=payload.issued_date,
        expiry_date=payload.expiry_date,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/users/{seafarer_id}/documents/{doc_id}", status_code=204)
def delete_document(
    seafarer_id: str,
    doc_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    doc = db.query(Document).filter(
        Document.id == doc_id, Document.seafarer_id == seafarer_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()


# ─── Seafarer self-service document endpoints ────────────────────────────────

def _doc_to_dict(r):
    return {
        # camelCase for JS clients
        "id": r.id,
        "documentName": r.name,
        "fileName": r.file_name,
        "savedName": r.saved_name,
        "codeName": r.code_name,
        "fileSize": r.file_size,
        "mimeType": r.mime_type,
        "category": r.category,
        "categoryLabel": r.category_label,
        "validityYears": r.validity_years,
        "issuingCountry": r.issuing_country,
        "issuedDate": r.issued_date.isoformat() if r.issued_date else None,
        "expiryDate": r.expiry_date.isoformat() if r.expiry_date else None,
        "uploadedAt": r.uploaded_at.isoformat() if r.uploaded_at else None,
        "verificationStatus": r.verification_status or "pending",
        "rejectionReason": r.rejection_reason,
        "verifiedAt": r.verified_at.isoformat() if r.verified_at else None,
        "aiVerdict": r.ai_verdict,
        # snake_case aliases kept for backward compat with admin code
        "name": r.name,
        "cert_code": r.cert_code,
        "doc_key": r.doc_key,
        "issuing_country": r.issuing_country,
        "verification_status": r.verification_status or "pending",
        "rejection_reason": r.rejection_reason,
    }


_DOC_SELECT = """
    SELECT id, name, cert_code, doc_key, issuing_country, code_name,
           file_name, saved_name, file_size, mime_type,
           category, category_label, validity_years,
           verification_status, rejection_reason, verified_at, ai_verdict,
           issued_date, expiry_date, uploaded_at
    FROM documents
"""


@router.get("/seafarer/me/documents/{doc_id}")
def get_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("seafarer",):
        raise HTTPException(status_code=403, detail="Seafarer access required")
    row = db.execute(text(_DOC_SELECT + " WHERE id = :did AND seafarer_id = :sid"),
                     {"did": doc_id, "sid": current_user.id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    return _doc_to_dict(row)


@router.get("/seafarer/me/documents")
def my_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("seafarer",):
        raise HTTPException(status_code=403, detail="Seafarer access required")
    rows = db.execute(text(_DOC_SELECT + """
        WHERE seafarer_id = :sid
        ORDER BY uploaded_at DESC
    """), {"sid": current_user.id}).fetchall()
    return [_doc_to_dict(r) for r in rows]


class DocSyncPayload(BaseModel):
    name: str
    doc_key: Optional[str] = None
    issuing_country: Optional[str] = None
    issued_date: Optional[str] = None
    expiry_date: Optional[str] = None
    file_name: Optional[str] = None
    saved_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    category: Optional[int] = None
    category_label: Optional[str] = None
    validity_years: Optional[int] = None


@router.post("/seafarer/me/documents/sync")
def sync_document(
    payload: DocSyncPayload,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("seafarer",):
        raise HTTPException(status_code=403, detail="Seafarer access required")

    now = datetime.now(timezone.utc)

    # Rank for code-name computation
    _sf_row = db.execute(text("SELECT rank FROM seafarers WHERE id = :id"), {"id": current_user.id}).fetchone()
    _rank = _sf_row.rank if _sf_row else None

    existing = db.execute(text("""
        SELECT id, cert_code, doc_key FROM documents WHERE seafarer_id = :sid AND name = :name
    """), {"sid": current_user.id, "name": payload.name}).fetchone()

    if existing:
        _cert_code = existing.cert_code
        _doc_key = payload.doc_key or existing.doc_key
        _code_name = build_codename(
            doc_name=payload.name, doc_key=_doc_key, cert_code=_cert_code,
            issuing_country=payload.issuing_country, expiry_date=payload.expiry_date,
            rank=_rank, seafarer_code=getattr(current_user, "seafarer_code", None),
        )
        db.execute(text("""
            UPDATE documents
            SET issued_date = :issued, expiry_date = :expiry,
                issuing_country = :issuing_country,
                file_name = :file_name, saved_name = :saved_name,
                file_size = :file_size, mime_type = :mime_type,
                category = :category, category_label = :category_label,
                validity_years = :validity_years,
                code_name = :code_name,
                verification_status = 'pending', updated_at = :now
            WHERE id = :id
        """), {
            "issued": payload.issued_date, "expiry": payload.expiry_date,
            "issuing_country": payload.issuing_country,
            "file_name": payload.file_name, "saved_name": payload.saved_name,
            "file_size": payload.file_size, "mime_type": payload.mime_type,
            "category": payload.category, "category_label": payload.category_label,
            "validity_years": payload.validity_years,
            "code_name": _code_name,
            "now": now, "id": existing.id,
        })
        db.commit()
        doc_id = existing.id
    else:
        doc_id = str(uuid.uuid4())
        _code_name = build_codename(
            doc_name=payload.name, doc_key=payload.doc_key, cert_code=None,
            issuing_country=payload.issuing_country, expiry_date=payload.expiry_date,
            rank=_rank, seafarer_code=getattr(current_user, "seafarer_code", None),
        )
        db.execute(text("""
            INSERT INTO documents
                (id, seafarer_id, name, doc_key, issuing_country, code_name,
                 file_name, saved_name, file_size, mime_type,
                 category, category_label, validity_years,
                 issued_date, expiry_date, verification_status, status, uploaded_at, updated_at)
            VALUES
                (:id, :sid, :name, :doc_key, :issuing_country, :code_name,
                 :file_name, :saved_name, :file_size, :mime_type,
                 :category, :category_label, :validity_years,
                 :issued, :expiry, 'pending', 'pending', :now, :now)
        """), {
            "id": doc_id, "sid": current_user.id, "name": payload.name,
            "doc_key": payload.doc_key, "issuing_country": payload.issuing_country,
            "code_name": _code_name,
            "file_name": payload.file_name, "saved_name": payload.saved_name,
            "file_size": payload.file_size, "mime_type": payload.mime_type,
            "category": payload.category, "category_label": payload.category_label,
            "validity_years": payload.validity_years,
            "issued": payload.issued_date, "expiry": payload.expiry_date,
            "now": now,
        })
        db.commit()

    row = db.execute(text(_DOC_SELECT + " WHERE id = :id"), {"id": doc_id}).fetchone()

    # Trigger OCR analysis in background (only when a physical file is attached)
    if payload.saved_name:
        background_tasks.add_task(
            analyze_document_background,
            doc_id=doc_id,
            user_id=str(current_user.id),
            saved_name=payload.saved_name,
            mime_type=payload.mime_type or "application/pdf",
            doc_key=payload.doc_key or payload.name,
        )

    return _doc_to_dict(row)


class DocDatesPayload(BaseModel):
    issued_date: Optional[str] = None
    expiry_date: Optional[str] = None
    issuing_country: Optional[str] = None


@router.patch("/seafarer/me/documents/{doc_id}")
def update_document_dates(
    doc_id: str,
    payload: DocDatesPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("seafarer",):
        raise HTTPException(status_code=403, detail="Seafarer access required")
    existing = db.execute(text("""
        SELECT id, name, doc_key, cert_code, issuing_country
        FROM documents WHERE id = :id AND seafarer_id = :sid
    """), {"id": doc_id, "sid": current_user.id}).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Document not found")

    # Codename depends on issuing_country and expiry_date, so recompute it whenever
    # either changes — otherwise an edited document keeps a stale download name.
    _sf_row = db.execute(text("SELECT rank FROM seafarers WHERE id = :id"), {"id": current_user.id}).fetchone()
    _rank = _sf_row.rank if _sf_row else None
    _country = payload.issuing_country if payload.issuing_country is not None else existing.issuing_country
    _code_name = build_codename(
        doc_name=existing.name, doc_key=existing.doc_key, cert_code=existing.cert_code,
        issuing_country=_country, expiry_date=payload.expiry_date,
        rank=_rank, seafarer_code=getattr(current_user, "seafarer_code", None),
    )

    db.execute(text("""
        UPDATE documents SET issued_date = :issued, expiry_date = :expiry,
            issuing_country = COALESCE(:issuing_country, issuing_country),
            code_name = :code_name,
            updated_at = :now
        WHERE id = :id
    """), {
        "issued": payload.issued_date, "expiry": payload.expiry_date,
        "issuing_country": payload.issuing_country,
        "code_name": _code_name,
        "now": datetime.now(timezone.utc), "id": doc_id,
    })
    db.commit()
    row = db.execute(text(_DOC_SELECT + " WHERE id = :id"), {"id": doc_id}).fetchone()
    return _doc_to_dict(row)


@router.delete("/seafarer/me/documents/{doc_id}", status_code=204)
def delete_my_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("seafarer",):
        raise HTTPException(status_code=403, detail="Seafarer access required")
    doc = db.execute(text("""
        SELECT id FROM documents WHERE id = :id AND seafarer_id = :sid
    """), {"id": doc_id, "sid": current_user.id}).fetchone()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.execute(text("DELETE FROM documents WHERE id = :id"), {"id": doc_id})
    db.commit()


@router.get("/seafarer/me/documents/export-manifest")
def export_manifest(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the file manifest needed by the Express export-zip handler."""
    if current_user.role not in ("seafarer",):
        raise HTTPException(status_code=403, detail="Seafarer access required")
    sf = db.execute(text("SELECT rank FROM seafarers WHERE id = :id"), {"id": current_user.id}).fetchone()
    rows = db.execute(text("""
        SELECT saved_name, code_name, category, mime_type, name
        FROM documents
        WHERE seafarer_id = :sid AND saved_name IS NOT NULL
        ORDER BY category NULLS LAST, name
    """), {"sid": current_user.id}).fetchall()
    return {
        "seafarer_code": getattr(current_user, "seafarer_code", None),
        "first_name": getattr(current_user, "first_name", None),
        "last_name": getattr(current_user, "last_name", None),
        "rank": sf.rank if sf else None,
        "docs": [
            {
                "savedName": r.saved_name,
                "codeName": r.code_name,
                "category": r.category,
                "mimeType": r.mime_type,
                "name": r.name,
            }
            for r in rows
        ],
    }


@router.post("/seafarer/me/documents/{doc_id}/request-review")
def request_human_review(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Seafarer requests a human review for a document rejected by OCR."""
    if current_user.role not in ("seafarer",):
        raise HTTPException(status_code=403, detail="Seafarer access required")
    doc = db.execute(text("""
        SELECT id, ai_verdict, verification_status
        FROM documents WHERE id = :id AND seafarer_id = :sid
    """), {"id": doc_id, "sid": current_user.id}).fetchone()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.verification_status == "verified":
        raise HTTPException(status_code=409, detail="Document is already verified")

    existing_verdict = doc.ai_verdict or {}
    updated_verdict = {**existing_verdict, "seafarer_review_requested": True}

    db.execute(text("""
        UPDATE documents
        SET verification_status = 'under_review',
            ai_verdict = CAST(:v AS jsonb),
            updated_at = :now
        WHERE id = :id
    """), {"v": json.dumps(updated_verdict), "now": datetime.now(timezone.utc), "id": doc_id})
    db.commit()

    row = db.execute(text(_DOC_SELECT + " WHERE id = :id"), {"id": doc_id}).fetchone()
    return _doc_to_dict(row)


@router.get("/seafarer/me/notifications")
def get_seafarer_notifications(
    since: Optional[str] = Query(None, description="ISO datetime — only return items updated after this"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return documents with status changes (verified/rejected) after the given timestamp."""
    if current_user.role != "seafarer":
        raise HTTPException(status_code=403, detail="Seafarer access required")

    params: dict = {"sid": current_user.id}
    since_clause = ""
    if since:
        try:
            datetime.fromisoformat(since.replace("Z", "+00:00"))
            since_clause = "AND updated_at > :since"
            params["since"] = since
        except Exception:
            pass

    rows = db.execute(text(f"""
        SELECT id, name, verification_status, rejection_reason, updated_at
        FROM documents
        WHERE seafarer_id = :sid
          AND verification_status IN ('verified', 'rejected')
          {since_clause}
        ORDER BY updated_at DESC
        LIMIT 50
    """), params).fetchall()

    return [
        {
            "id": str(r.id),
            "documentName": r.name,
            "type": r.verification_status,
            "rejectionReason": r.rejection_reason,
            "updatedAt": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]


@router.post("/seafarer/me/documents/{doc_id}/analyze")
def trigger_analyze(
    doc_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manual re-trigger of OCR analysis for a specific document."""
    if current_user.role not in ("seafarer",):
        raise HTTPException(status_code=403, detail="Seafarer access required")
    doc = db.execute(text("""
        SELECT id, saved_name, mime_type, doc_key, name
        FROM documents WHERE id = :id AND seafarer_id = :sid
    """), {"id": doc_id, "sid": current_user.id}).fetchone()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.saved_name:
        raise HTTPException(status_code=422, detail="Document has no physical file to analyze")

    background_tasks.add_task(
        analyze_document_background,
        doc_id=doc.id,
        user_id=str(current_user.id),
        saved_name=doc.saved_name,
        mime_type=doc.mime_type or "application/pdf",
        doc_key=doc.doc_key or doc.name,
    )
    return {"queued": True, "doc_id": doc_id}
