"""Admin API — Fleet (read-only).

Split out of the former single-file routers/admin.py (T18): code moved verbatim,
only the imports were pruned per module. Routes are aggregated in admin/__init__.py.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.deps import require_admin
from app.models.user import User

router = APIRouter()

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
