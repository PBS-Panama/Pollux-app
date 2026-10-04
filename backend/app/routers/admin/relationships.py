"""Admin API — Company-seafarer relationships.

Split out of the former single-file routers/admin.py (T18): code moved verbatim,
only the imports were pruned per module. Routes are aggregated in admin/__init__.py.
"""

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
