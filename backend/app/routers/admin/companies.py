"""Admin API — Company user management.

Split out of the former single-file routers/admin.py (T18): code moved verbatim,
only the imports were pruned per module. Routes are aggregated in admin/__init__.py.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.deps import require_admin
from app.models.user import User

router = APIRouter()

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
