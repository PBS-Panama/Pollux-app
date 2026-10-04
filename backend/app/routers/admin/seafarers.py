"""Admin API — Seafarer user management.

Split out of the former single-file routers/admin.py (T18): code moved verbatim,
only the imports were pruned per module. Routes are aggregated in admin/__init__.py.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.deps import require_admin
from app.models.user import User

router = APIRouter()

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
