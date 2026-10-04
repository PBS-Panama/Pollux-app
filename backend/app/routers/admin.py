import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from sqlalchemy import text, bindparam
from sqlalchemy.dialects.postgresql import JSONB
from app.db.session import get_db
from app.core.config import settings
from app.core.deps import require_admin
from app.core.security import create_access_token
from app.core.rate_limit import limiter
from app.models.user import User
from app.models.seafarer import Seafarer
from app.models.document import Document
from app.services.compliance_engine import build_compliance_report
from app.services.token_crypto import encrypt_token
# Aliased: app.services.secret_loader (T9/T10, infra secrets panel — SECRET_KEY/
# DRIVE_TOKEN_SECRET/etc.) also exports a `get_secret`/`invalidate` with a
# DIFFERENT signature. Both modules are used in this file; importing either
# unaliased would silently shadow the other at module-load time regardless
# of which function in the file calls it.
from app.services.secret_store import (
    SECRET_NAMES, get_secret as get_api_key_secret, invalidate as invalidate_secret_cache,
)

router = APIRouter()

# ─── Overview ───────────────────────────────────────────────────────────────

@router.get("/me")
def admin_me(admin: User = Depends(require_admin)):
    return {"id": admin.id, "email": admin.email, "role": admin.role}


@router.get("/stats")
def admin_stats(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    seafarers = db.execute(text("SELECT COUNT(*) FROM users WHERE role = 'seafarer'")).scalar()
    companies  = db.execute(text("SELECT COUNT(*) FROM users WHERE role = 'company'")).scalar()
    docs       = db.execute(text("SELECT COUNT(*) FROM documents")).scalar()
    try:
        pending = db.execute(
            text("SELECT COUNT(*) FROM documents WHERE verification_status = 'pending' OR verification_status IS NULL")
        ).scalar()
    except Exception:
        db.rollback()
        pending = docs
    return {"seafarers": seafarers, "companies": companies, "documents": docs, "pending_docs": pending}


# ─── Module 1A — Seafarer User Management ───────────────────────────────────

@router.get("/seafarers")
def list_seafarers(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    search: str = Query(""),
    rank: str = Query(""),
    fleet: str = Query(""),
    status: str = Query("all"),   # all | active | suspended
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
):
    where = ["u.role = 'seafarer'"]
    params: dict = {}

    if search:
        where.append("(s.first_name ILIKE :search OR s.last_name ILIKE :search OR u.email ILIKE :search)")
        params["search"] = f"%{search}%"
    if rank:
        where.append("s.rank ILIKE :rank")
        params["rank"] = f"%{rank}%"
    if fleet:
        where.append("s.fleet_category = :fleet")
        params["fleet"] = fleet
    if status == "active":
        where.append("u.is_active = true")
    elif status == "suspended":
        where.append("u.is_active = false")

    where_sql = " AND ".join(where)
    offset = (page - 1) * limit
    params.update({"limit": limit, "offset": offset})

    rows = db.execute(text(f"""
        SELECT u.id, u.email, u.is_active, u.created_at,
               s.first_name, s.last_name, s.nationality, s.rank,
               s.fleet_category, s.is_available, s.years_experience
        FROM users u
        LEFT JOIN seafarers s ON s.id = u.id
        WHERE {where_sql}
        ORDER BY u.created_at DESC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()

    total = db.execute(text(f"""
        SELECT COUNT(*) FROM users u
        LEFT JOIN seafarers s ON s.id = u.id
        WHERE {where_sql}
    """), {k: v for k, v in params.items() if k not in ("limit", "offset")}).scalar()

    return {
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
        "items": [
            {
                "id": r.id, "email": r.email, "is_active": r.is_active,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "first_name": r.first_name, "last_name": r.last_name,
                "nationality": r.nationality, "rank": r.rank,
                "fleet_category": r.fleet_category, "is_available": r.is_available,
                "years_experience": r.years_experience,
            }
            for r in rows
        ],
    }


@router.get("/seafarers/{seafarer_id}")
def get_seafarer(seafarer_id: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT u.id, u.email, u.is_active, u.created_at,
               s.first_name, s.last_name, s.nationality, s.date_of_birth,
               s.phone, s.rank, s.fleet_category, s.years_experience,
               s.bio, s.is_available, s.coc_type, s.coc_issuing_country,
               s.coc_tonnage_limit, s.cop_tanker_type, s.cop_tanker_level,
               s.flag_endorsements, s.special_endorsements
        FROM users u
        LEFT JOIN seafarers s ON s.id = u.id
        WHERE u.id = :id AND u.role = 'seafarer'
    """), {"id": seafarer_id}).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Seafarer not found")

    docs = db.execute(text("""
        SELECT id, name, cert_code, doc_key, issued_date, expiry_date,
               status, verification_status, rejection_reason, verified_at, uploaded_at
        FROM documents WHERE seafarer_id = :id ORDER BY uploaded_at DESC
    """), {"id": seafarer_id}).fetchall()

    return {
        "id": row.id, "email": row.email, "is_active": row.is_active,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "first_name": row.first_name, "last_name": row.last_name,
        "nationality": row.nationality,
        "date_of_birth": row.date_of_birth.isoformat() if row.date_of_birth else None,
        "phone": row.phone, "rank": row.rank, "fleet_category": row.fleet_category,
        "years_experience": row.years_experience, "bio": row.bio,
        "is_available": row.is_available, "coc_type": row.coc_type,
        "coc_issuing_country": row.coc_issuing_country,
        "coc_tonnage_limit": row.coc_tonnage_limit,
        "cop_tanker_type": row.cop_tanker_type, "cop_tanker_level": row.cop_tanker_level,
        "flag_endorsements": row.flag_endorsements,
        "special_endorsements": row.special_endorsements,
        "documents": [
            {
                "id": d.id, "name": d.name, "cert_code": d.cert_code,
                "doc_key": d.doc_key,
                "issued_date": d.issued_date.isoformat() if d.issued_date else None,
                "expiry_date": d.expiry_date.isoformat() if d.expiry_date else None,
                "status": d.status,
                "verification_status": d.verification_status or "pending",
                "rejection_reason": d.rejection_reason,
                "verified_at": d.verified_at.isoformat() if d.verified_at else None,
                "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
            }
            for d in docs
        ],
    }


class StatusPatch(BaseModel):
    is_active: bool


@router.patch("/seafarers/{seafarer_id}/status")
def patch_seafarer_status(
    seafarer_id: str,
    payload: StatusPatch,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    result = db.execute(
        text("UPDATE users SET is_active = :active, updated_at = :now WHERE id = :id AND role = 'seafarer' RETURNING id"),
        {"active": payload.is_active, "now": datetime.now(timezone.utc), "id": seafarer_id},
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Seafarer not found")
    db.commit()
    return {"id": seafarer_id, "is_active": payload.is_active}


@router.delete("/seafarers/{seafarer_id}", status_code=204)
def delete_seafarer(
    seafarer_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Permanently remove a seafarer — for cleaning up demo/seed accounts (Rick,
    2026-09-12) one at a time as real seafarers replace them. Unlike the status
    toggle above, this is not reversible.

    No table here has ON DELETE CASCADE from seafarers except
    seafarer_learning_progress (Postgres handles that one automatically) —
    documents/crew_assignments are RESTRICT and relationships has no FK at all,
    so dependents are deleted explicitly, in order, before the seafarer/user row.
    """
    result = db.execute(
        text("SELECT id FROM users WHERE id = :id AND role = 'seafarer'"), {"id": seafarer_id}
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Seafarer not found")

    db.execute(text("DELETE FROM documents WHERE seafarer_id = :id"), {"id": seafarer_id})
    db.execute(text("DELETE FROM crew_assignments WHERE seafarer_id = :id"), {"id": seafarer_id})
    db.execute(text("DELETE FROM relationships WHERE seafarer_id = :id"), {"id": seafarer_id})
    db.execute(text("DELETE FROM seafarers WHERE id = :id"), {"id": seafarer_id})
    db.execute(text("DELETE FROM users WHERE id = :id"), {"id": seafarer_id})
    db.commit()


# ─── Module 1B — Company User Management ────────────────────────────────────

@router.get("/companies")
def list_companies(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    search: str = Query(""),
    verified: Optional[str] = Query(None),   # "true" | "false" | None
    status: Optional[str] = Query(None),     # "pending" | "approved" | "rejected" | None
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
):
    where = ["u.role = 'company'"]
    params: dict = {}

    if search:
        where.append("(c.name ILIKE :search OR u.email ILIKE :search)")
        params["search"] = f"%{search}%"
    if verified == "true":
        where.append("c.is_verified = true")
    elif verified == "false":
        where.append("c.is_verified = false")
    if status in ("pending", "approved", "rejected"):
        where.append("c.company_status = :status")
        params["status"] = status

    where_sql = " AND ".join(where)
    offset = (page - 1) * limit
    params.update({"limit": limit, "offset": offset})

    rows = db.execute(text(f"""
        SELECT u.id, u.email, u.is_active, u.created_at, u.email_verified,
               c.id as company_id, c.name, c.country, c.fleet_size, c.is_verified,
               c.company_status, c.rejection_reason
        FROM users u
        JOIN companies c ON c.id = u.company_id
        WHERE {where_sql}
        ORDER BY u.created_at DESC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()

    total = db.execute(text(f"""
        SELECT COUNT(*) FROM users u
        JOIN companies c ON c.id = u.company_id
        WHERE {where_sql}
    """), {k: v for k, v in params.items() if k not in ("limit", "offset")}).scalar()

    return {
        "total": total, "page": page, "pages": max(1, -(-total // limit)),
        "items": [
            {
                "id": r.id, "email": r.email, "is_active": r.is_active,
                "email_verified": r.email_verified,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "company_id": r.company_id, "name": r.name, "country": r.country,
                "fleet_size": r.fleet_size, "is_verified": r.is_verified,
                "company_status": r.company_status, "rejection_reason": r.rejection_reason,
            }
            for r in rows
        ],
    }


@router.get("/companies/{company_id}")
def get_company(company_id: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT u.id, u.email, u.is_active, u.created_at, u.email_verified,
               c.id as cid, c.name, c.country, c.fleet_size, c.is_verified,
               c.company_status, c.rejection_reason
        FROM users u
        JOIN companies c ON c.id = u.company_id
        WHERE u.id = :id AND u.role = 'company'
    """), {"id": company_id}).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Company not found")

    # Only seafarers actually linked to THIS company via the relationships table —
    # was previously an unfiltered "any 50 active seafarers" query (same result for
    # every company_id, regardless of who they're actually linked to).
    seafarers = db.execute(text("""
        SELECT s.id, s.first_name, s.last_name, s.rank, s.fleet_category, r.status AS relationship_status
        FROM relationships r
        JOIN seafarers s ON s.id = r.seafarer_id
        JOIN users u ON u.id = s.id
        WHERE r.company_id = :cid AND u.is_active = true
        LIMIT 50
    """), {"cid": row.cid}).fetchall()

    return {
        "id": row.id, "email": row.email, "is_active": row.is_active,
        "email_verified": row.email_verified,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "company_id": row.cid, "name": row.name, "country": row.country,
        "fleet_size": row.fleet_size, "is_verified": row.is_verified,
        "company_status": row.company_status, "rejection_reason": row.rejection_reason,
        "seafarers_sample": [
            {"id": s.id, "first_name": s.first_name, "last_name": s.last_name,
             "rank": s.rank, "fleet_category": s.fleet_category, "relationship_status": s.relationship_status}
            for s in seafarers
        ],
    }


class CompanyVerifyPatch(BaseModel):
    is_verified: bool


@router.patch("/companies/{company_id}/status")
def patch_company_status(
    company_id: str,
    payload: CompanyVerifyPatch,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    result = db.execute(
        text("UPDATE companies SET is_verified = :v WHERE id = (SELECT company_id FROM users WHERE id = :uid) RETURNING id"),
        {"v": payload.is_verified, "uid": company_id},
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Company not found")
    db.commit()
    return {"id": company_id, "is_verified": payload.is_verified}


class CompanyRejectPayload(BaseModel):
    reason: str


@router.patch("/companies/{company_id}/approve")
def approve_company(company_id: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """The real approval gate (Rick, 2026-09-14) — companies.company_status is
    one of the two checks routers/company.py's _require_company enforces on
    every /company/* call (the other is users.email_verified)."""
    result = db.execute(text("""
        UPDATE companies SET company_status = 'approved', rejection_reason = NULL
        WHERE id = (SELECT company_id FROM users WHERE id = :uid) RETURNING id
    """), {"uid": company_id}).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Company not found")
    db.commit()
    return {"company_status": "approved"}


@router.patch("/companies/{company_id}/verify-email")
def verify_company_email(company_id: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Manual bridge for the other half of _require_company's gate
    (users.email_verified) — same effect as the company clicking its
    verification email link, done by an admin instead. This is the escape
    hatch for when that email doesn't arrive: no real transactional provider
    existed when the gate was built, and even with one (gmail_api,
    2026-09-14), a specific send can still fail or land in spam. `company_id`
    here is the USER id, same convention as approve/reject above."""
    result = db.execute(text("""
        UPDATE users SET email_verified = TRUE WHERE id = :uid AND role = 'company'
        RETURNING id
    """), {"uid": company_id}).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Company account not found")
    db.commit()
    return {"email_verified": True}


@router.patch("/companies/{company_id}/reject")
def reject_company(
    company_id: str,
    payload: CompanyRejectPayload,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not payload.reason.strip():
        raise HTTPException(status_code=400, detail="A rejection reason is required")
    result = db.execute(text("""
        UPDATE companies SET company_status = 'rejected', rejection_reason = :reason
        WHERE id = (SELECT company_id FROM users WHERE id = :uid) RETURNING id
    """), {"uid": company_id, "reason": payload.reason.strip()}).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Company not found")
    db.commit()
    return {"company_status": "rejected", "rejection_reason": payload.reason.strip()}


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


# ─── Module 3 — Compliance Monitor ─────────────────────────────────────────

@router.get("/compliance/overview")
def compliance_overview(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    seafarers = (
        db.query(Seafarer)
        .join(User, Seafarer.id == User.id)
        .filter(User.is_active == True, Seafarer.rank.isnot(None), Seafarer.rank != "")
        .all()
    )

    scores = []
    rank_data: dict = {}
    fully_compliant = 0
    critical_blocked = 0

    for s in seafarers:
        verified_docs = (
            db.query(Document)
            .filter(Document.seafarer_id == s.id, Document.verification_status == "verified")
            .all()
        )
        report = build_compliance_report(
            s.rank, verified_docs, db=db,
            coc_type=getattr(s, "coc_type", None),
            cop_tanker_type=getattr(s, "cop_tanker_type", None),
            cop_tanker_level=getattr(s, "cop_tanker_level", None),
            flag_endorsements=getattr(s, "flag_endorsements", None),
            special_endorsements=getattr(s, "special_endorsements", None),
            vessel_type_ids=getattr(s, "vessel_types", None),
        )
        score_pct = round(report.compliance_score * 100)
        scores.append(score_pct)

        if report.is_fully_compliant:
            fully_compliant += 1
        if not report.can_be_listed:
            critical_blocked += 1

        rank_data.setdefault(s.rank, []).append(score_pct)

    avg_score = round(sum(scores) / len(scores)) if scores else 0

    distribution = [0, 0, 0, 0]
    for sc in scores:
        if sc <= 25:
            distribution[0] += 1
        elif sc <= 50:
            distribution[1] += 1
        elif sc <= 75:
            distribution[2] += 1
        else:
            distribution[3] += 1

    rank_breakdown = sorted(
        [
            {"rank": rank, "count": len(rs), "avg_score": round(sum(rs) / len(rs))}
            for rank, rs in rank_data.items()
        ],
        key=lambda x: -x["avg_score"],
    )

    expiry_rows = db.execute(text("""
        SELECT d.name, d.expiry_date, d.verification_status,
               s.first_name, s.last_name, s.rank,
               (d.expiry_date::date - CURRENT_DATE) AS days_left
        FROM documents d
        JOIN seafarers s ON d.seafarer_id = s.id
        WHERE d.expiry_date IS NOT NULL
          AND d.expiry_date::date >= CURRENT_DATE
          AND d.expiry_date::date <= (CURRENT_DATE + INTERVAL '90 days')
        ORDER BY d.expiry_date ASC
        LIMIT 50
    """)).fetchall()

    expiry_alerts = [
        {
            "seafarer_name": f"{r.first_name} {r.last_name}",
            "rank": r.rank,
            "doc_name": r.name,
            "expiry_date": r.expiry_date.isoformat() if hasattr(r.expiry_date, "isoformat") else str(r.expiry_date),
            "days_left": int(r.days_left) if r.days_left is not None else 0,
            "verification_status": r.verification_status or "pending",
        }
        for r in expiry_rows
    ]

    return {
        "summary": {
            "total_seafarers_with_rank": len(seafarers),
            "avg_score": avg_score,
            "fully_compliant": fully_compliant,
            "critical_blocked": critical_blocked,
        },
        "distribution": {
            "labels": ["0–25%", "26–50%", "51–75%", "76–100%"],
            "values": distribution,
        },
        "rank_breakdown": rank_breakdown,
        "expiry_alerts": expiry_alerts,
    }


# ─── Module 6 — Company–Seafarer Relationships ──────────────────────────────

class RelationshipCreate(BaseModel):
    company_id: str
    seafarer_id: str
    notes: Optional[str] = None

class RelationshipPatch(BaseModel):
    status: str          # pending | active | rejected | ended
    notes: Optional[str] = None


@router.get("/relationships")
def list_relationships(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    status: str = Query("all"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
):
    where = ["1=1"]
    params: dict = {}

    if status != "all":
        where.append("r.status = :status")
        params["status"] = status

    where_sql = " AND ".join(where)
    offset = (page - 1) * limit
    params.update({"limit": limit, "offset": offset})

    rows = db.execute(text(f"""
        SELECT r.id, r.company_id, r.seafarer_id, r.status, r.notes, r.created_at, r.updated_at,
               c.name AS company_name,
               s.first_name, s.last_name, s.rank
        FROM relationships r
        LEFT JOIN companies c ON c.id = r.company_id
        LEFT JOIN seafarers s ON s.id = r.seafarer_id
        WHERE {where_sql}
        ORDER BY r.created_at DESC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()

    total = db.execute(text(f"""
        SELECT COUNT(*) FROM relationships r WHERE {where_sql}
    """), {k: v for k, v in params.items() if k not in ("limit", "offset")}).scalar()

    counts = db.execute(text("""
        SELECT status, COUNT(*) as cnt FROM relationships GROUP BY status
    """)).fetchall()
    status_counts = {r.status: r.cnt for r in counts}

    return {
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
        "status_counts": status_counts,
        "items": [
            {
                "id": r.id,
                "company_id": r.company_id,
                "company_name": r.company_name or r.company_id,
                "seafarer_id": r.seafarer_id,
                "seafarer_name": f"{r.first_name or ''} {r.last_name or ''}".strip() or r.seafarer_id,
                "seafarer_rank": r.rank,
                "status": r.status or "pending",
                "notes": r.notes,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ],
    }


@router.post("/relationships", status_code=201)
def create_relationship(
    payload: RelationshipCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    import uuid as _uuid
    new_id = str(_uuid.uuid4())
    now = datetime.now(timezone.utc)
    # No email_verified check on purpose (Rick, nota 57/59) — an admin pairing
    # a company with a seafarer by hand is a deliberate override of the
    # self-service gate company.py's hire_seafarer enforces, not an oversight.
    db.execute(text("""
        INSERT INTO relationships (id, company_id, seafarer_id, status, notes, created_at, updated_at)
        VALUES (:id, :cid, :sid, 'pending', :notes, :now, :now)
    """), {"id": new_id, "cid": payload.company_id, "sid": payload.seafarer_id,
          "notes": payload.notes, "now": now})
    db.commit()
    return {"id": new_id, "status": "pending"}


@router.patch("/relationships/{rel_id}")
def update_relationship(
    rel_id: str,
    payload: RelationshipPatch,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if payload.status not in ("pending", "active", "rejected", "ended"):
        raise HTTPException(status_code=400, detail="status must be pending | active | rejected | ended")
    now = datetime.now(timezone.utc)
    # No email_verified check on purpose (Rick, nota 57/59) — same as
    # create_relationship above: an admin setting status='active' by hand is
    # a deliberate override, not a path that's supposed to be gated.
    result = db.execute(text("""
        UPDATE relationships
        SET status = :status, notes = COALESCE(:notes, notes), updated_at = :now
        WHERE id = :id RETURNING id
    """), {"status": payload.status, "notes": payload.notes, "now": now, "id": rel_id}).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Relationship not found")
    db.commit()
    return {"id": rel_id, "status": payload.status}


@router.delete("/relationships/{rel_id}", status_code=204)
def delete_relationship(
    rel_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    result = db.execute(
        text("DELETE FROM relationships WHERE id = :id RETURNING id"), {"id": rel_id}
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Relationship not found")
    db.commit()


# ─── Module 5 — Exams & Training Centers ────────────────────────────────────

import json as _json
from typing import List


class ExamCourseCreate(BaseModel):
    name: str
    code: str = ""
    stcw_ref: str = ""
    level: str = "All Levels"
    departments: List[str] = []
    description: str = ""
    duration: str = ""
    validity: str = ""


class ExamCourseUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    stcw_ref: Optional[str] = None
    level: Optional[str] = None
    departments: Optional[List[str]] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    validity: Optional[str] = None
    is_active: Optional[bool] = None


class TrainingCenterCreate(BaseModel):
    name: str
    abbreviation: str = ""
    city: str = ""
    district: str = ""
    type: str = ""
    resolution: str = ""
    website: Optional[str] = None
    courses_count: Optional[int] = None
    specialties: List[str] = []
    notes: str = ""


class TrainingCenterUpdate(BaseModel):
    name: Optional[str] = None
    abbreviation: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    type: Optional[str] = None
    resolution: Optional[str] = None
    website: Optional[str] = None
    courses_count: Optional[int] = None
    specialties: Optional[List[str]] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/exams/courses")
def admin_list_exam_courses(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    level: str = Query(""),
    search: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    where = ["1=1"]
    params: dict = {}
    if level:
        where.append("level = :level")
        params["level"] = level
    if search:
        where.append("(name ILIKE :search OR code ILIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = " AND ".join(where)
    offset = (page - 1) * limit
    params.update({"limit": limit, "offset": offset})
    rows = db.execute(text(f"""
        SELECT id, name, code, stcw_ref, level, departments, description, duration, validity, is_active
        FROM exam_courses WHERE {where_sql}
        ORDER BY CASE level WHEN 'All Levels' THEN 1 WHEN 'Ratings' THEN 2 WHEN 'OOW' THEN 3 WHEN 'Management' THEN 4 ELSE 5 END, name ASC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()
    total = db.execute(
        text(f"SELECT COUNT(*) FROM exam_courses WHERE {where_sql}"),
        {k: v for k, v in params.items() if k not in ("limit", "offset")},
    ).scalar()
    return {
        "total": total, "page": page, "pages": max(1, -(-total // limit)),
        "items": [
            {
                "id": r.id, "name": r.name, "code": r.code, "stcw_ref": r.stcw_ref,
                "level": r.level,
                "departments": r.departments if isinstance(r.departments, list) else _json.loads(r.departments or "[]"),
                "description": r.description, "duration": r.duration,
                "validity": r.validity, "is_active": r.is_active,
            }
            for r in rows
        ],
    }


@router.post("/exams/courses", status_code=201)
def admin_create_exam_course(
    payload: ExamCourseCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    import uuid as _uuid
    new_id = str(_uuid.uuid4())
    now = datetime.now(timezone.utc)
    _stmt = text(
        "INSERT INTO exam_courses (id, name, code, stcw_ref, level, departments, description, duration, validity, created_at, updated_at) "
        "VALUES (:id, :name, :code, :stcw_ref, :level, :departments, :description, :duration, :validity, :now, :now)"
    ).bindparams(bindparam("departments", type_=JSONB))
    db.execute(_stmt, {
        "id": new_id, "name": payload.name, "code": payload.code, "stcw_ref": payload.stcw_ref,
        "level": payload.level, "departments": payload.departments,
        "description": payload.description, "duration": payload.duration,
        "validity": payload.validity, "now": now,
    })
    db.commit()
    return {"id": new_id}


@router.patch("/exams/courses/{course_id}")
def admin_update_exam_course(
    course_id: str,
    payload: ExamCourseUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    sets = []
    params: dict = {"id": course_id, "now": datetime.now(timezone.utc)}
    for field, val in payload.model_dump(exclude_unset=True).items():
        if field == "departments":
            sets.append("departments = :departments")
            params["departments"] = _json.dumps(val)
        else:
            sets.append(f"{field} = :{field}")
            params[field] = val
    if not sets:
        raise HTTPException(status_code=400, detail="No fields to update")
    sets.append("updated_at = :now")
    result = db.execute(
        text(f"UPDATE exam_courses SET {', '.join(sets)} WHERE id = :id RETURNING id"), params
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Course not found")
    db.commit()
    return {"id": course_id}


@router.delete("/exams/courses/{course_id}", status_code=204)
def admin_delete_exam_course(
    course_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    result = db.execute(
        text("DELETE FROM exam_courses WHERE id = :id RETURNING id"), {"id": course_id}
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Course not found")
    db.commit()


@router.get("/exams/centers")
def admin_list_training_centers(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    search: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    where = ["1=1"]
    params: dict = {}
    if search:
        where.append("(name ILIKE :search OR abbreviation ILIKE :search OR city ILIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = " AND ".join(where)
    offset = (page - 1) * limit
    params.update({"limit": limit, "offset": offset})
    rows = db.execute(text(f"""
        SELECT id, name, abbreviation, city, district, type, resolution, website, courses_count, specialties, notes, is_active
        FROM training_centers WHERE {where_sql}
        ORDER BY courses_count DESC NULLS LAST, name ASC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()
    total = db.execute(
        text(f"SELECT COUNT(*) FROM training_centers WHERE {where_sql}"),
        {k: v for k, v in params.items() if k not in ("limit", "offset")},
    ).scalar()
    return {
        "total": total, "page": page, "pages": max(1, -(-total // limit)),
        "items": [
            {
                "id": r.id, "name": r.name, "abbreviation": r.abbreviation,
                "city": r.city, "district": r.district, "type": r.type,
                "resolution": r.resolution, "website": r.website,
                "courses_count": r.courses_count,
                "specialties": r.specialties if isinstance(r.specialties, list) else _json.loads(r.specialties or "[]"),
                "notes": r.notes, "is_active": r.is_active,
            }
            for r in rows
        ],
    }


@router.post("/exams/centers", status_code=201)
def admin_create_training_center(
    payload: TrainingCenterCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    import uuid as _uuid
    new_id = str(_uuid.uuid4())
    now = datetime.now(timezone.utc)
    _tc_stmt = text(
        "INSERT INTO training_centers (id, name, abbreviation, city, district, type, resolution, website, courses_count, specialties, notes, created_at, updated_at) "
        "VALUES (:id, :name, :abbreviation, :city, :district, :type, :resolution, :website, :courses_count, :specialties, :notes, :now, :now)"
    ).bindparams(bindparam("specialties", type_=JSONB))
    db.execute(_tc_stmt, {
        "id": new_id, "name": payload.name, "abbreviation": payload.abbreviation,
        "city": payload.city, "district": payload.district, "type": payload.type,
        "resolution": payload.resolution, "website": payload.website,
        "courses_count": payload.courses_count,
        "specialties": payload.specialties, "notes": payload.notes, "now": now,
    })
    db.commit()
    return {"id": new_id}


@router.patch("/exams/centers/{center_id}")
def admin_update_training_center(
    center_id: str,
    payload: TrainingCenterUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    sets = []
    params: dict = {"id": center_id, "now": datetime.now(timezone.utc)}
    for field, val in payload.model_dump(exclude_unset=True).items():
        if field == "specialties":
            sets.append("specialties = :specialties")
            params["specialties"] = _json.dumps(val)
        else:
            sets.append(f"{field} = :{field}")
            params[field] = val
    if not sets:
        raise HTTPException(status_code=400, detail="No fields to update")
    sets.append("updated_at = :now")
    result = db.execute(
        text(f"UPDATE training_centers SET {', '.join(sets)} WHERE id = :id RETURNING id"), params
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Center not found")
    db.commit()
    return {"id": center_id}


@router.delete("/exams/centers/{center_id}", status_code=204)
def admin_delete_training_center(
    center_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    result = db.execute(
        text("DELETE FROM training_centers WHERE id = :id RETURNING id"), {"id": center_id}
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Center not found")
    db.commit()


# ─── Module 7 — Platform Configuration ──────────────────────────────────────

class SettingPatch(BaseModel):
    value: str
    description: Optional[str] = None


@router.get("/config/settings")
def get_settings(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT key, value, description, updated_at FROM platform_settings ORDER BY key")).fetchall()
    return [
        {
            "key": r.key,
            "value": r.value,
            "description": r.description,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]


@router.patch("/config/settings/{key}")
def update_setting(
    key: str,
    payload: SettingPatch,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    result = db.execute(text("""
        UPDATE platform_settings
        SET value = :value,
            description = COALESCE(:desc, description),
            updated_at = :now
        WHERE key = :key RETURNING key
    """), {"key": key, "value": payload.value, "desc": payload.description, "now": now}).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Setting not found")
    db.commit()
    return {"key": key, "value": payload.value}


# ─── Third-party secrets — write-only, encrypted (Handover.md nota 48/136) ──
# NOT stored in platform_settings on purpose: that table's GET returns raw
# values to the browser, and a billable API key has no business making that
# round trip. Reuses token_crypto.py (Fernet, same helper Drive refresh
# tokens already use) instead of inventing a second encryption mechanism.
# SECRET_NAMES (app/services/secret_store.py) is the single source of truth
# for which keys live here — see that module's docstring for the full list
# of what's deliberately NOT here (SECRET_KEY, DATABASE_URL, DRIVE_TOKEN_
# SECRET, DRIVE_STATE_SECRET, GOOGLE_OAUTH_CLIENT_ID) and why.
# get_secret() (secret_store.py) reads this table first and falls back to
# the env var, everywhere a consumer needs one of these — the L-4 fail-fast
# in ocr_provider.get_ocr_provider() (RuntimeError when neither is set in
# production) is untouched: it's what keeps a deleted key loud instead of
# letting documents silently sit in 'pending' forever.

class ApiKeyPatch(BaseModel):
    key_name: str
    value: str
    # Same reauth as /secrets/{name}/rotate — a stolen admin session alone
    # must not be able to swap the OCR/Drive keys.
    current_password: str


def _key_hint(value: str) -> str:
    tail = value.strip()[-4:] if len(value.strip()) >= 4 else "****"
    return f"...{tail}"


@router.get("/config/api-keys")
def list_api_keys(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT k.key_name, k.hint, k.updated_at, k.updated_by, u.email AS updated_by_email
        FROM api_key_config k LEFT JOIN users u ON u.id = k.updated_by
    """)).fetchall()
    by_name = {r.key_name: r for r in rows}
    return [
        {
            "key_name": name,
            "configured": name in by_name,
            "hint": by_name[name].hint if name in by_name else None,
            "updated_at": by_name[name].updated_at.isoformat() if name in by_name else None,
            "updated_by": by_name[name].updated_by if name in by_name else None,
            # The panel shows "actualizada por <quién>" — updated_by is a user id.
            "updated_by_email": by_name[name].updated_by_email if name in by_name else None,
        }
        for name in SECRET_NAMES
    ]


@router.patch("/config/api-keys")
@limiter.limit("10/hour")
def update_api_key(
    request: Request,
    payload: ApiKeyPatch,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if payload.key_name not in SECRET_NAMES:
        raise HTTPException(
            status_code=400,
            detail=f"key_name must be one of {SECRET_NAMES}",
        )
    _require_reauth(admin, payload.current_password)
    value = payload.value.strip()
    if not value:
        raise HTTPException(status_code=400, detail="value cannot be empty")

    encrypted = encrypt_token(value)
    hint = _key_hint(value)
    now = datetime.now(timezone.utc)
    db.execute(text("""
        INSERT INTO api_key_config (key_name, encrypted_value, hint, updated_at, updated_by)
        VALUES (:name, :enc, :hint, :now, :by)
        ON CONFLICT (key_name) DO UPDATE
        SET encrypted_value = EXCLUDED.encrypted_value,
            hint = EXCLUDED.hint,
            updated_at = EXCLUDED.updated_at,
            updated_by = EXCLUDED.updated_by
    """), {"name": payload.key_name, "enc": encrypted, "hint": hint, "now": now, "by": admin.id})
    db.commit()
    # So the next get_secret() call (any consumer, same process) sees the new
    # value immediately instead of serving the old one for up to CACHE_TTL_SECONDS.
    invalidate_secret_cache(payload.key_name)
    # Never echo the value back — the whole point of write-only.
    return {"key_name": payload.key_name, "configured": True, "hint": hint, "updated_at": now.isoformat()}


# ─── Test a configured secret against its provider (Handover.md nota 136) ───
# Exercises the value get_secret() would actually return right now (DB first,
# env fallback) with the cheapest real call each provider offers — never a
# document/user-facing operation. Never echoes the value or any fragment of
# it beyond what list_api_keys() already exposes (the 4-char hint).
#
# The provider-specific logic lives in _run_key_test(), a plain function with
# no FastAPI/slowapi decorators, so test_secret_store.py can call it directly
# with a fake value and a monkeypatched provider SDK/urlopen — no HTTP layer,
# no real network call, no real key needed to exercise the branching.
# Identical contract to Castor's (same function name, same response shape) —
# this is the endpoint Rick asked to mirror exactly (T13), replacing the
# 2026-10-02 body-based POST /config/api-keys/test + ocr_provider.check_api_key().

_TINY_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)  # 1x1 transparent PNG — cheapest possible images:annotate call


def _run_key_test(key_name: str, value: str) -> dict:
    """key_name is assumed already validated against SECRET_NAMES, value
    already resolved (truthy) by the caller. Returns the full response dict
    — never raises on a provider-side rejection, only on a programming error
    (unknown key_name)."""
    if key_name == "ANTHROPIC_API_KEY":
        try:
            import anthropic
        except ImportError:
            return {"key_name": key_name, "ok": False, "detail": "anthropic SDK not installed"}
        try:
            # models.list() costs no tokens — just lists what the key can see.
            anthropic.Anthropic(api_key=value).models.list(limit=1)
            return {"key_name": key_name, "ok": True, "detail": "models.list() succeeded"}
        except anthropic.AuthenticationError:
            return {"key_name": key_name, "ok": False, "detail": "authentication failed — key rejected by Anthropic"}
        except Exception as exc:
            return {"key_name": key_name, "ok": False, "detail": f"{type(exc).__name__} (see server logs for detail)"}

    if key_name == "GOOGLE_VISION_API_KEY":
        import urllib.request
        import urllib.parse
        import urllib.error
        try:
            req = urllib.request.Request(
                f"https://vision.googleapis.com/v1/images:annotate?key={urllib.parse.quote(value, safe='')}",
                data=json.dumps({
                    "requests": [{
                        "image": {"content": _TINY_PNG_B64},
                        "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
                    }]
                }).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read())
            outer = (data.get("responses") or [{}])[0]
            if outer.get("error"):
                return {"key_name": key_name, "ok": False, "detail": outer["error"].get("message", "")[:160]}
            return {"key_name": key_name, "ok": True, "detail": "images:annotate succeeded"}
        except urllib.error.HTTPError as exc:
            return {"key_name": key_name, "ok": False, "detail": f"HTTP {exc.code} — key rejected or not enabled for Vision API"}
        except Exception as exc:
            return {"key_name": key_name, "ok": False, "detail": f"{type(exc).__name__} (see server logs for detail)"}

    if key_name == "GOOGLE_DRIVE_CLIENT_SECRET":
        return {
            "key_name": key_name,
            "ok": None,
            "detail": "no verificable sin consentimiento del usuario — el client secret solo se valida "
                      "en un intercambio de token OAuth real (authorization code de un usuario), no hay "
                      "forma de probarlo de forma aislada contra Google",
        }

    raise ValueError(f"no test defined for {key_name}")


@router.post("/config/api-keys/{key_name}/test")
@limiter.limit("10/hour")
def test_api_key(
    request: Request,
    key_name: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if key_name not in SECRET_NAMES:
        raise HTTPException(status_code=400, detail=f"key_name must be one of {SECRET_NAMES}")

    value = get_api_key_secret(key_name, db)
    if not value:
        return {"key_name": key_name, "ok": False, "detail": "not configured (no value in DB or env)"}

    return _run_key_test(key_name, value)


# ─── Infra secrets panel (T8/T9/T10, docs/specs/secrets-panel.md) ───────────
# SECRET_KEY / DRIVE_TOKEN_SECRET / DRIVE_STATE_SECRET — the infra-level
# secrets that live in Secret Manager, not in api_key_config (that table is
# for the third-party API keys above — ANTHROPIC_API_KEY/GOOGLE_VISION_
# API_KEY/GOOGLE_DRIVE_CLIENT_SECRET — a different storage mechanism
# entirely). SECRET_KEY/DRIVE_TOKEN_SECRET are shared with Castor and have
# rotation disabled until Castor supports it (ROTATION_DISABLED, T13). Every
# action logs to secret_rotation_log (0013): who, what,
# which stored version, never the value.

from app.services.secret_loader import (
    MANAGED_SECRETS, AUTO_GENERATABLE, ROTATION_DISABLED, get_secret, get_secret_previous,
    list_metadata, stage_new_value, rollback as _rollback_secret,
    generate_random_value, SecretNotConfigured,
)
from app.core.security import verify_password


def _log_secret_action(db: Session, name: str, action: str, version, result: str, detail: str, admin_id: str) -> None:
    import uuid as _uuid
    db.execute(text("""
        INSERT INTO secret_rotation_log
            (id, secret_name, action, secret_version, result, detail, performed_by, performed_at)
        VALUES (:id, :name, :action, :version, :result, :detail, :by, :now)
    """), {
        "id": str(_uuid.uuid4()), "name": name, "action": action,
        "version": str(version) if version is not None else "-",
        "result": result, "detail": detail[:500], "by": admin_id,
        "now": datetime.now(timezone.utc),
    })


class SecretReauthRequest(BaseModel):
    current_password: str


class SecretRotateRequest(SecretReauthRequest):
    # Optional for every secret in this panel now — all of MANAGED_SECRETS are
    # auto-generatable (AUTO_GENERATABLE). GOOGLE_DRIVE_CLIENT_SECRET, which
    # used to need an explicit value here, moved to api_key_config (T13).
    value: Optional[str] = None


class SecretTestRequest(BaseModel):
    value: Optional[str] = None  # candidate to test; auto-generated if omitted (non-destructive either way)


def _require_reauth(admin: User, current_password: str) -> None:
    if not verify_password(current_password, admin.hashed_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")


def _check_secret_name(name: str) -> None:
    if name not in MANAGED_SECRETS:
        raise HTTPException(status_code=404, detail=f"Unknown secret '{name}' — must be one of {MANAGED_SECRETS}")


@router.get("/secrets")
def list_secrets(admin: User = Depends(require_admin)):
    result = []
    for name in MANAGED_SECRETS:
        meta = list_metadata(name)
        meta["rotation_disabled"] = name in ROTATION_DISABLED
        meta["rotation_disabled_reason"] = ROTATION_DISABLED.get(name)
        result.append(meta)
    return result


def _check_rotation_allowed(name: str) -> None:
    if name in ROTATION_DISABLED:
        raise HTTPException(status_code=403, detail=ROTATION_DISABLED[name])


@router.get("/secrets/{name}/audit")
def secret_audit_log(
    name: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    _check_secret_name(name)
    rows = db.execute(text("""
        SELECT action, secret_version, result, detail, performed_by, performed_at
        FROM secret_rotation_log
        WHERE secret_name = :name
        ORDER BY performed_at DESC
        LIMIT :limit
    """), {"name": name, "limit": limit}).fetchall()
    return [
        {
            "action": r.action, "version": r.secret_version, "result": r.result,
            "detail": r.detail, "performed_by": r.performed_by,
            "performed_at": r.performed_at.isoformat(),
        }
        for r in rows
    ]


def _test_secret_key(candidate: str) -> str:
    test_payload = {"_secrets_panel_test": True}
    token = jwt_encode_for_test(test_payload, candidate)
    decoded = jwt_decode_for_test(token, candidate)
    if decoded.get("_secrets_panel_test") is not True:
        raise ValueError("round trip did not return the expected payload")
    return "sign+verify round trip OK (throwaway token, no real session touched)"


def jwt_encode_for_test(payload: dict, secret: str) -> str:
    from jose import jwt as _jwt
    from app.core.config import settings as _settings
    return _jwt.encode(payload, secret, algorithm=_settings.ALGORITHM)


def jwt_decode_for_test(token: str, secret: str) -> dict:
    from jose import jwt as _jwt
    from app.core.config import settings as _settings
    return _jwt.decode(token, secret, algorithms=[_settings.ALGORITHM])


def _test_drive_token_secret(candidate: str) -> str:
    from app.services.token_crypto import encrypt_token as _enc, decrypt_token as _dec
    probe = "secrets-panel-test-value"
    ciphertext = _enc(probe, secret=candidate)
    plain = _dec(ciphertext, secret=candidate)
    if plain != probe:
        raise ValueError("encrypt/decrypt round trip did not return the original value")
    return "encrypt+decrypt round trip OK (throwaway value, no stored row touched)"


def _test_drive_state_secret(candidate: str) -> str:
    import hashlib as _hashlib
    import hmac as _hmac
    digest = _hmac.new(candidate.encode(), b"probe-user-id", _hashlib.sha256).hexdigest()[:16]
    if len(digest) != 16:
        raise ValueError("HMAC did not produce the expected length")
    return "HMAC sign round trip OK (throwaway state, no real OAuth flow touched)"


@router.post("/secrets/{name}/test")
@limiter.limit("20/hour")
def test_secret(request: Request, name: str, payload: SecretTestRequest, admin: User = Depends(require_admin)):
    """Non-destructive — never writes to Secret Manager/the dev store, never
    touches drive_tokens/api_key_config. Safe to call as many times as
    needed before an actual rotation."""
    _check_secret_name(name)
    candidate = payload.value or (generate_random_value() if name in AUTO_GENERATABLE else None)
    if not candidate:
        raise HTTPException(status_code=400, detail="value is required for this secret (cannot auto-generate)")

    # All of MANAGED_SECRETS has a tester — _check_secret_name above already
    # filtered to one of these 3 names, so this dict is exhaustive, not a
    # fallback for something unlisted (GOOGLE_DRIVE_CLIENT_SECRET isn't in
    # MANAGED_SECRETS at all anymore, T13 — see secret_loader.py).
    testers = {
        "SECRET_KEY": _test_secret_key,
        "DRIVE_TOKEN_SECRET": _test_drive_token_secret,
        "DRIVE_STATE_SECRET": _test_drive_state_secret,
    }
    tester = testers[name]
    try:
        message = tester(candidate)
        return {"ok": True, "message": message}
    except Exception as exc:
        return {"ok": False, "message": f"Test failed: {exc}"}


def _reencrypt_drive_secret_rows(db: Session, old_secret: str, new_secret: str) -> str:
    """Decrypts every drive_tokens.encrypted_rt and api_key_config.encrypted_value
    row with `old_secret` and re-encrypts with `new_secret`, in the caller's
    transaction (not committed here — the caller commits only after this AND
    the new secret version are both ready, so a failure here never leaves a
    rotation half-applied). Returns a short human summary for the audit log."""
    from app.services.token_crypto import encrypt_token as _enc, decrypt_token as _dec

    drive_rows = db.execute(text("SELECT user_id, encrypted_rt FROM drive_tokens")).fetchall()
    for row in drive_rows:
        plain = _dec(row.encrypted_rt, secret=old_secret)
        new_cipher = _enc(plain, secret=new_secret)
        db.execute(
            text("UPDATE drive_tokens SET encrypted_rt = :c WHERE user_id = :uid"),
            {"c": new_cipher, "uid": row.user_id},
        )

    key_rows = db.execute(text("SELECT key_name, encrypted_value FROM api_key_config")).fetchall()
    for row in key_rows:
        plain = _dec(row.encrypted_value, secret=old_secret)
        new_cipher = _enc(plain, secret=new_secret)
        db.execute(
            text("UPDATE api_key_config SET encrypted_value = :c WHERE key_name = :k"),
            {"c": new_cipher, "k": row.key_name},
        )

    return f"re-encrypted {len(drive_rows)} drive_tokens row(s), {len(key_rows)} api_key_config row(s)"


@router.post("/secrets/{name}/rotate")
@limiter.limit("10/hour")
def rotate_secret(
    request: Request, name: str, payload: SecretRotateRequest,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    _check_secret_name(name)
    _check_rotation_allowed(name)
    _require_reauth(admin, payload.current_password)

    new_value = payload.value
    if not new_value:
        if name not in AUTO_GENERATABLE:
            raise HTTPException(status_code=400, detail="value is required for this secret (cannot auto-generate)")
        new_value = generate_random_value()

    detail = "rotated"
    try:
        if name == "DRIVE_TOKEN_SECRET":
            # Order matters, strictly: (1) re-encrypt everything with the new
            # value inside this request's DB transaction, (2) COMMIT that —
            # the DB now genuinely holds data encrypted with the new value,
            # while get_secret() still returns the OLD one — (3) only now
            # flip the secret store to the new value. If we flipped the
            # store before committing the DB and the commit then failed,
            # get_secret() would start returning a key that doesn't match
            # what's actually stored in the rows — exactly the inconsistency
            # this ordering exists to rule out.
            try:
                old_value = get_secret(name)
            except SecretNotConfigured:
                old_value = None
            if old_value:
                detail = _reencrypt_drive_secret_rows(db, old_value, new_value)
                db.commit()
        version = stage_new_value(name, new_value)
        _log_secret_action(db, name, "rotate", version.version, "ok", detail, admin.id)
        db.commit()
        return {"name": name, "hint": list_metadata(name)["hint"], "version": version.version, "detail": detail}
    except Exception as exc:
        db.rollback()
        _log_secret_action(db, name, "rotate", None, "error", str(exc)[:200], admin.id)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Rotation failed, nothing was changed: {exc}")


@router.post("/secrets/{name}/rollback")
@limiter.limit("10/hour")
def rollback_secret(
    request: Request, name: str, payload: SecretReauthRequest,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    _check_secret_name(name)
    _check_rotation_allowed(name)
    _require_reauth(admin, payload.current_password)

    meta = list_metadata(name)
    if not meta["has_previous"]:
        raise HTTPException(status_code=400, detail="No previous version to roll back to")

    detail = "rolled back"
    try:
        if name == "DRIVE_TOKEN_SECRET":
            # Same ordering rule as rotate: re-encrypt + commit BEFORE
            # flipping the secret store back.
            current_value = get_secret(name)
            previous_value = get_secret_previous(name)
            detail = _reencrypt_drive_secret_rows(db, current_value, previous_value)
            db.commit()
        new_latest = _rollback_secret(name)
        _log_secret_action(db, name, "rollback", new_latest.version if new_latest else None, "ok", detail, admin.id)
        db.commit()
        return {
            "name": name, "hint": list_metadata(name)["hint"],
            "version": new_latest.version if new_latest else None, "detail": detail,
        }
    except Exception as exc:
        db.rollback()
        _log_secret_action(db, name, "rollback", None, "error", str(exc)[:200], admin.id)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Rollback failed, nothing was changed: {exc}")

class CatalogEntryCreate(BaseModel):
    rank: str
    fleet_cat: Optional[str] = None
    doc_name: str
    cert: Optional[str] = None
    level: str = "standard"
    cert_type: str = "D/P"
    validity_years: Optional[int] = None
    is_required: bool = True


class CatalogEntryUpdate(BaseModel):
    doc_name: Optional[str] = None
    cert: Optional[str] = None
    level: Optional[str] = None
    cert_type: Optional[str] = None
    validity_years: Optional[int] = None
    is_required: Optional[bool] = None


# Fase 2 (2026-09-14, nota (25) del PM): el repunte de GET /api/compliance/catalog/{rank}
# a required_docs_for_profile() + DOC_METADATA dejó a esta tabla sin ningún lector real —
# nada en el cálculo de compliance la consulta. Este CRUD hoy deja a un admin creer que
# edita el catálogo real cuando no cambia nada en el producto. GET queda de solo lectura
# (informativo, mismo shape — nada que lea hoy este endpoint se rompe) mientras se decide
# el resto de la Fase 2 (migrar a metadata-por-título, ~90 filas en vez de las de hoy).
# Las 3 mutaciones quedan deshabilitadas con 410 y un detail explícito: "editable sin
# efecto" es peor que "no editable ahora mismo" (mismo principio que discoverable/paso 3
# del registro — una UI no confirma lo que no hace).
_CATALOG_DEPRECATED_DETAIL = (
    "Este catálogo ya no es la fuente de verdad del cálculo de compliance — la membership "
    "vive en document_requirements.py (backend). Edición deshabilitada hasta la Fase 2 "
    "(migrar esta tabla a metadata por título). Ver Handover.md, nota (25)."
)


@router.get("/config/catalog")
def get_rank_catalog_admin(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, rank, fleet_cat, doc_name, cert, level, cert_type, validity_years, is_required
        FROM rank_compliance_catalog
        ORDER BY fleet_cat, rank, id
    """)).fetchall()
    result: dict = {}
    for r in rows:
        rank = r.rank
        if rank not in result:
            result[rank] = {"count": 0, "fleet_cat": r.fleet_cat, "docs": []}
        result[rank]["docs"].append({
            "id": r.id,
            "name": r.doc_name,
            "cert": r.cert,
            "level": r.level,
            "cert_type": r.cert_type,
            "validity_years": r.validity_years,
            "is_required": r.is_required,
        })
        result[rank]["count"] = len(result[rank]["docs"])
    return result


@router.post("/config/catalog", status_code=410)
def add_catalog_entry(payload: CatalogEntryCreate, admin: User = Depends(require_admin)):
    raise HTTPException(status_code=410, detail=_CATALOG_DEPRECATED_DETAIL)


@router.patch("/config/catalog/{entry_id}")
def update_catalog_entry(entry_id: int, payload: CatalogEntryUpdate, admin: User = Depends(require_admin)):
    raise HTTPException(status_code=410, detail=_CATALOG_DEPRECATED_DETAIL)


@router.delete("/config/catalog/{entry_id}")
def delete_catalog_entry(entry_id: int, admin: User = Depends(require_admin)):
    raise HTTPException(status_code=410, detail=_CATALOG_DEPRECATED_DETAIL)


# ─── Module 8 — Analytics ────────────────────────────────────────────────────

@router.get("/analytics/overview")
def analytics_overview(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    # Users
    total_users    = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
    seafarers_cnt  = db.execute(text("SELECT COUNT(*) FROM users WHERE role = 'seafarer'")).scalar()
    companies_cnt  = db.execute(text("SELECT COUNT(*) FROM users WHERE role = 'company'")).scalar()
    admins_cnt     = db.execute(text("SELECT COUNT(*) FROM users WHERE role = 'admin'")).scalar()
    new_users_30d  = db.execute(text(
        "SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days'"
    )).scalar()

    # Documents
    total_docs  = db.execute(text("SELECT COUNT(*) FROM documents")).scalar()
    docs_30d    = db.execute(text(
        "SELECT COUNT(*) FROM documents WHERE uploaded_at >= NOW() - INTERVAL '30 days'"
    )).scalar()
    doc_statuses = db.execute(text("""
        SELECT COALESCE(verification_status, 'pending') AS vs, COUNT(*) AS cnt
        FROM documents GROUP BY vs
    """)).fetchall()
    by_status = {r.vs: int(r.cnt) for r in doc_statuses}

    # Seafarers
    with_rank    = db.execute(text(
        "SELECT COUNT(*) FROM seafarers WHERE rank IS NOT NULL AND rank != ''"
    )).scalar()
    without_rank = db.execute(text(
        "SELECT COUNT(*) FROM seafarers WHERE rank IS NULL OR rank = ''"
    )).scalar()
    available    = db.execute(text(
        "SELECT COUNT(*) FROM seafarers WHERE is_available = true"
    )).scalar()
    by_fleet = db.execute(text("""
        SELECT COALESCE(fleet_category, 'unknown') AS cat, COUNT(*) AS cnt
        FROM seafarers GROUP BY cat ORDER BY cnt DESC
    """)).fetchall()
    fleet_breakdown = {r.cat: int(r.cnt) for r in by_fleet}

    # Platform counts
    rels_total   = db.execute(text("SELECT COUNT(*) FROM relationships")).scalar()
    rels_active  = db.execute(text("SELECT COUNT(*) FROM relationships WHERE status = 'active'")).scalar()
    exam_courses = db.execute(text("SELECT COUNT(*) FROM exam_courses WHERE is_active = true")).scalar()
    tc_count     = db.execute(text("SELECT COUNT(*) FROM training_centers WHERE is_active = true")).scalar()
    lr_series    = db.execute(text("SELECT COUNT(*) FROM learning_series WHERE is_published = true")).scalar()

    # Registrations last 7 days (daily)
    daily_regs = db.execute(text("""
        SELECT DATE_TRUNC('day', created_at)::date AS day, COUNT(*) AS cnt
        FROM users
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY day ORDER BY day
    """)).fetchall()
    daily_registrations = [
        {"date": str(r.day), "count": int(r.cnt)} for r in daily_regs
    ]

    return {
        "users": {
            "total": int(total_users),
            "seafarers": int(seafarers_cnt),
            "companies": int(companies_cnt),
            "admins": int(admins_cnt),
            "new_30d": int(new_users_30d),
        },
        "documents": {
            "total": int(total_docs),
            "new_30d": int(docs_30d),
            "by_status": by_status,
        },
        "seafarers": {
            "with_rank": int(with_rank),
            "without_rank": int(without_rank),
            "available": int(available),
            "by_fleet_category": fleet_breakdown,
        },
        "platform": {
            "relationships_total": int(rels_total),
            "active_relationships": int(rels_active),
            "exam_courses_active": int(exam_courses),
            "training_centers_active": int(tc_count),
            "learning_series_published": int(lr_series),
        },
        "daily_registrations": daily_registrations,
    }


# ─── Module 9 — Admin Alerts (fallback log from frontend) ───────────────────

class AlertCreate(BaseModel):
    level: str = "warn"           # info | warn | error
    source: str = Field(max_length=100)  # e.g. "Library.js", "Compliance.js"
    message: str = Field(max_length=2000)
    context: Optional[dict] = None

    @field_validator("context")
    @classmethod
    def _cap_context(cls, v):
        if v is not None and len(json.dumps(v)) > MAX_ALERT_CONTEXT_CHARS:
            raise ValueError("context too large")
        return v


MAX_ALERT_CONTEXT_CHARS = 4000


@router.post("/alerts", status_code=201)
@limiter.limit("20/minute")
def create_alert(
    request: Request,
    payload: AlertCreate,
    db: Session = Depends(get_db),
):
    """
    Open endpoint (no auth required) — frontend posts here when it falls back
    to local crewDocData.js because the backend required-docs endpoint was
    unavailable.  Logs to admin_alerts table for ops visibility.
    """
    import uuid as _uuid
    now = datetime.now(timezone.utc)
    db.execute(text("""
        INSERT INTO admin_alerts (id, level, source, message, context, created_at)
        VALUES (:id, :level, :source, :message, CAST(:context AS jsonb), :now)
    """), {
        "id": str(_uuid.uuid4()),
        "level": payload.level if payload.level in ("info", "warn", "error") else "warn",
        "source": payload.source[:100],
        "message": payload.message,
        "context": json.dumps(payload.context) if payload.context else None,
        "now": now,
    })
    db.commit()
    return {"ok": True}


# ─── Module — OCR Doc Type Rules (Obj.3) ────────────────────────────────────

class DocTypeRulePayload(BaseModel):
    doc_key: str
    expected_keywords: list = []
    red_flag_keywords: list = []
    min_confidence: float = 0.5
    auto_verify_threshold: float = 0.9
    number_regex: Optional[str] = None
    notes: Optional[str] = None


@router.get("/doc-type-rules")
def list_doc_type_rules(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT doc_key, expected_keywords, red_flag_keywords,
               min_confidence, auto_verify_threshold, number_regex, notes, updated_at
        FROM doc_type_rules ORDER BY doc_key
    """)).fetchall()
    return [
        {
            "docKey": r.doc_key,
            "expectedKeywords": r.expected_keywords or [],
            "redFlagKeywords": r.red_flag_keywords or [],
            "minConfidence": r.min_confidence,
            "autoVerifyThreshold": r.auto_verify_threshold,
            "numberRegex": r.number_regex,
            "notes": r.notes,
            "updatedAt": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]


@router.post("/doc-type-rules", status_code=201)
def create_doc_type_rule(
    payload: DocTypeRulePayload,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    existing = db.execute(text("SELECT doc_key FROM doc_type_rules WHERE doc_key = :dk"),
                          {"dk": payload.doc_key}).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Rule for this doc_key already exists")
    db.execute(text("""
        INSERT INTO doc_type_rules
            (doc_key, expected_keywords, red_flag_keywords, min_confidence,
             auto_verify_threshold, number_regex, notes, updated_at)
        VALUES
            (:dk, CAST(:exp AS jsonb), CAST(:red AS jsonb), :min_c, :auto, :rx, :notes, NOW())
    """), {
        "dk": payload.doc_key,
        "exp": json.dumps(payload.expected_keywords),
        "red": json.dumps(payload.red_flag_keywords),
        "min_c": payload.min_confidence,
        "auto": payload.auto_verify_threshold,
        "rx": payload.number_regex,
        "notes": payload.notes,
    })
    db.commit()
    return {"ok": True, "docKey": payload.doc_key}


@router.put("/doc-type-rules/{doc_key:path}")
def update_doc_type_rule(
    doc_key: str,
    payload: DocTypeRulePayload,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    result = db.execute(text("""
        UPDATE doc_type_rules
        SET expected_keywords = CAST(:exp AS jsonb),
            red_flag_keywords = CAST(:red AS jsonb),
            min_confidence = :min_c,
            auto_verify_threshold = :auto,
            number_regex = :rx,
            notes = :notes,
            updated_at = NOW()
        WHERE doc_key = :dk
        RETURNING doc_key
    """), {
        "dk": doc_key,
        "exp": json.dumps(payload.expected_keywords),
        "red": json.dumps(payload.red_flag_keywords),
        "min_c": payload.min_confidence,
        "auto": payload.auto_verify_threshold,
        "rx": payload.number_regex,
        "notes": payload.notes,
    }).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.commit()
    return {"ok": True, "docKey": doc_key}


@router.delete("/doc-type-rules/{doc_key:path}", status_code=204)
def delete_doc_type_rule(
    doc_key: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    db.execute(text("DELETE FROM doc_type_rules WHERE doc_key = :dk"), {"dk": doc_key})
    db.commit()


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
    import urllib.request as _urllib_request
    import urllib.parse as _urllib_parse
    from fastapi.responses import Response as _Response

    row = db.execute(text("""
        SELECT seafarer_id, saved_name, mime_type FROM documents WHERE id = :id
    """), {"id": doc_id}).fetchone()
    if not row or not row.saved_name:
        raise HTTPException(status_code=404, detail="File not found")

    encoded = _urllib_parse.quote(row.saved_name, safe="")
    url = f"{settings.CASTOR_BASE_URL}/api/users/{row.seafarer_id}/myfiles/download/{encoded}"

    try:
        # Explicit service marker, not a disguised admin user — see
        # company.py's _fetch_castor_file for why (Rick/Castor, 2026-09-14).
        token = create_access_token({"sub": "pollux-admin-proxy", "svc": True})
        req = _urllib_request.Request(url, headers={"Authorization": f"Bearer {token}"})
        with _urllib_request.urlopen(req, timeout=15) as resp:
            content = resp.read()
            content_type = row.mime_type or resp.headers.get("Content-Type", "application/octet-stream")
    except Exception as exc:
        # Already surfaced via the 502 below, but that doesn't reach Cloud
        # Run's own logs — print for server-side visibility too.
        status = getattr(exc, "code", None)
        print(f"[admin.admin_get_document_file] fetch failed status={status} url={url} seafarer_id={row.seafarer_id}: {exc}", flush=True)
        raise HTTPException(status_code=502, detail=f"Could not fetch file from storage: {exc}")

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
    ocr = get_ocr_provider(doc_key, db=db).extract(file_bytes, mime)
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


# ─── Module 7 — Fleet (read-only — "Mi Flota" visibility for future assistance) ──
# Vessels and rotations are created/edited only from the company side
# (routers/company.py). The admin panel just needs to see them — e.g. knowing who
# is aboard which vessel and when.

@router.get("/fleet")
def list_fleet(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    search: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
):
    where = ["1=1"]
    params: dict = {}
    if search:
        where.append("(v.name ILIKE :search OR c.name ILIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = " AND ".join(where)
    offset = (page - 1) * limit
    params.update({"limit": limit, "offset": offset})

    rows = db.execute(text(f"""
        SELECT v.id, v.name, v.vessel_type, v.flag_country, v.imo_number, v.mmsi_number,
               v.crew_capacity, v.is_active, v.created_at,
               c.id AS company_id, c.name AS company_name,
               (SELECT COUNT(*) FROM crew_assignments a
                WHERE a.vessel_id = v.id AND a.status IN ('scheduled', 'aboard')
                  AND a.embark_date <= CURRENT_DATE
                  AND COALESCE(a.disembark_date, 'infinity'::date) >= CURRENT_DATE
               ) AS current_crew_count
        FROM vessels v
        JOIN companies c ON c.id = v.company_id
        WHERE {where_sql}
        ORDER BY v.created_at DESC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()

    total = db.execute(text(f"""
        SELECT COUNT(*) FROM vessels v JOIN companies c ON c.id = v.company_id WHERE {where_sql}
    """), {k: v for k, v in params.items() if k not in ("limit", "offset")}).scalar()

    return {
        "total": total, "page": page, "pages": max(1, -(-total // limit)),
        "items": [
            {
                "id": r.id, "name": r.name, "vessel_type": r.vessel_type,
                "flag_country": r.flag_country, "imo_number": r.imo_number, "mmsi_number": r.mmsi_number,
                "crew_capacity": r.crew_capacity, "is_active": r.is_active,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "company_id": r.company_id, "company_name": r.company_name,
                "current_crew_count": r.current_crew_count,
            }
            for r in rows
        ],
    }


@router.get("/fleet/{vessel_id}/assignments")
def get_fleet_vessel_assignments(
    vessel_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    vessel = db.execute(text("""
        SELECT v.id, v.name, c.name AS company_name
        FROM vessels v JOIN companies c ON c.id = v.company_id
        WHERE v.id = :id
    """), {"id": vessel_id}).fetchone()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")

    rows = db.execute(text("""
        SELECT a.id, a.seafarer_id, a.rank, a.embark_date, a.disembark_date, a.status, a.notes,
               s.first_name, s.last_name
        FROM crew_assignments a
        JOIN seafarers s ON s.id = a.seafarer_id
        WHERE a.vessel_id = :vid
        ORDER BY a.embark_date DESC
    """), {"vid": vessel_id}).fetchall()

    return {
        "vessel_id": vessel.id, "vessel_name": vessel.name, "company_name": vessel.company_name,
        "items": [
            {
                "id": a.id, "seafarer_id": a.seafarer_id,
                "seafarer_name": f"{a.first_name or ''} {a.last_name or ''}".strip(),
                "rank": a.rank,
                "embark_date": a.embark_date.isoformat() if a.embark_date else None,
                "disembark_date": a.disembark_date.isoformat() if a.disembark_date else None,
                "status": a.status, "notes": a.notes,
            }
            for a in rows
        ],
    }


# ─── Module 8 — CV Template (branding + placeholders for company downloads) ──
# Single-row table (id='default'). The rendered HTML is what
# /company/seafarers/{id}/cv (company.py) fills in with a real seafarer's
# data and converts to PDF — this only edits the template + branding.

from app.services.cv_generator import render_template as _render_cv_template, SAMPLE_CONTEXT as _CV_SAMPLE_CONTEXT


class CvTemplatePatch(BaseModel):
    html_template: Optional[str] = None
    logo_b64: Optional[str] = None
    accent_color: Optional[str] = None


@router.get("/cv-template")
def get_cv_template(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.execute(text(
        "SELECT html_template, logo_b64, accent_color, updated_at FROM cv_templates WHERE id = 'default'"
    )).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="CV template not found")
    return {
        "html_template": row.html_template,
        "logo_b64": row.logo_b64,
        "accent_color": row.accent_color,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


@router.patch("/cv-template")
def update_cv_template(
    payload: CvTemplatePatch,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    col_map = {"html_template": "html_template", "logo_b64": "logo_b64", "accent_color": "accent_color"}
    set_clauses = ", ".join(f"{col_map[k]} = :{k}" for k in updates)
    params = dict(updates)
    params["now"] = datetime.now(timezone.utc)
    result = db.execute(text(f"""
        UPDATE cv_templates SET {set_clauses}, updated_at = :now
        WHERE id = 'default'
        RETURNING html_template, logo_b64, accent_color, updated_at
    """), params).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="CV template not found")
    db.commit()
    return {
        "html_template": result.html_template,
        "logo_b64": result.logo_b64,
        "accent_color": result.accent_color,
        "updated_at": result.updated_at.isoformat() if result.updated_at else None,
    }


class CvTemplatePreviewPayload(BaseModel):
    html_template: Optional[str] = None
    logo_b64: Optional[str] = None
    accent_color: Optional[str] = None


@router.post("/cv-template/preview")
def preview_cv_template(
    payload: CvTemplatePreviewPayload,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Renders the given (possibly unsaved) template/branding with sample
    data — lets the admin see edits live before hitting Save."""
    row = db.execute(text(
        "SELECT html_template, logo_b64, accent_color FROM cv_templates WHERE id = 'default'"
    )).fetchone()
    html_template = payload.html_template if payload.html_template is not None else (row.html_template if row else "")
    logo_b64 = payload.logo_b64 if payload.logo_b64 is not None else (row.logo_b64 if row else None)
    accent_color = payload.accent_color if payload.accent_color is not None else (row.accent_color if row else "#0ea5e9")
    rendered = _render_cv_template(html_template, _CV_SAMPLE_CONTEXT, logo_b64, accent_color)
    return {"html": rendered}
