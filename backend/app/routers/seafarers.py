import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.models.seafarer import Seafarer
from app.schemas.seafarer import (
    SeafarerAmpUpdate,
    SeafarerAmpResponse,
    SeafarerProfileUpdate,
    BadgeProgressUpsert,
)

router = APIRouter()


def _seafarer_to_dict(seafarer: Seafarer, seafarer_code: str | None = None) -> dict:
    return {
        "id": seafarer.id,
        "first_name": seafarer.first_name,
        "last_name": seafarer.last_name,
        "gender": seafarer.gender,
        "nationality": seafarer.nationality,
        "nationalities": seafarer.nationalities,
        "date_of_birth": seafarer.date_of_birth.isoformat() if seafarer.date_of_birth else None,
        "phone": seafarer.phone,
        "bio": seafarer.bio,
        "is_available": seafarer.is_available,
        "rank": seafarer.rank,
        "department": seafarer.department,
        "fleet_category": seafarer.fleet_category,
        "years_experience": seafarer.years_experience,
        "vessel_types": seafarer.vessel_types,
        "spoken_languages": seafarer.spoken_languages,
        "city": seafarer.city,
        "residence_country": seafarer.residence_country,
        "residence_province": seafarer.residence_province,
        "reference_airport": seafarer.reference_airport,
        "emergency_contact_name": seafarer.emergency_contact_name,
        "emergency_contact_relation": seafarer.emergency_contact_relation,
        "emergency_contact_phone": seafarer.emergency_contact_phone,
        "coc_type": seafarer.coc_type,
        "coc_issuing_country": seafarer.coc_issuing_country,
        "coc_tonnage_limit": seafarer.coc_tonnage_limit,
        "cop_tanker_type": seafarer.cop_tanker_type,
        "cop_tanker_level": seafarer.cop_tanker_level,
        "flag_endorsements": seafarer.flag_endorsements,
        "special_endorsements": seafarer.special_endorsements,
        "seafarer_code": seafarer_code,
        "discoverable": seafarer.discoverable,
    }


# ─── Unified profile facade (me) — single source of truth ────────────────────

@router.get("/seafarers/me/profile")
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    seafarer = db.query(Seafarer).filter(Seafarer.id == current_user.id).first()
    if not seafarer:
        raise HTTPException(status_code=404, detail="Seafarer not found")
    row = db.execute(text("SELECT seafarer_code FROM users WHERE id = :id"), {"id": current_user.id}).fetchone()
    return _seafarer_to_dict(seafarer, row[0] if row else None)


@router.patch("/seafarers/me/profile")
def update_my_profile(
    payload: SeafarerProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    seafarer = db.query(Seafarer).filter(Seafarer.id == current_user.id).first()
    if not seafarer:
        raise HTTPException(status_code=404, detail="Seafarer not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if hasattr(seafarer, field):
            setattr(seafarer, field, value)
    db.commit()
    return {"ok": True}


# ─── Company link + programmed schedule (Mi Flota) ───────────────────────────
# "Linked to a company" is gated through `relationships.status = 'active'` (the
# two-step hire → assign model company.py's create_assignment enforces — a
# crew_assignments row can only exist once that relationship is active). If no
# active relationship exists, the seafarer manages their own calendar manually;
# once hired, whatever the company schedules in crew_assignments is reflected
# here read-only.

@router.get("/seafarers/me/company-schedule")
def get_my_company_schedule(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "seafarer":
        raise HTTPException(status_code=403, detail="Only seafarers have a company schedule")

    rel = db.execute(text("""
        SELECT r.company_id, c.name AS company_name
        FROM relationships r
        JOIN companies c ON c.id = r.company_id
        WHERE r.seafarer_id = :sid AND r.status = 'active'
        ORDER BY r.updated_at DESC
        LIMIT 1
    """), {"sid": current_user.id}).fetchone()

    if not rel:
        return {"linked": False, "company_name": None, "assignments": []}

    rows = db.execute(text("""
        SELECT a.id, a.rank, a.embark_date, a.disembark_date, a.status, a.notes,
               v.name AS vessel_name, v.vessel_type
        FROM crew_assignments a
        JOIN vessels v ON v.id = a.vessel_id
        WHERE a.seafarer_id = :sid AND a.company_id = :cid
        ORDER BY a.embark_date DESC
    """), {"sid": current_user.id, "cid": rel.company_id}).fetchall()

    return {
        "linked": True,
        "company_name": rel.company_name,
        "assignments": [
            {
                "id": r.id,
                "vessel_name": r.vessel_name,
                "vessel_type": r.vessel_type,
                "rank": r.rank,
                "embark_date": r.embark_date.isoformat() if r.embark_date else None,
                "disembark_date": r.disembark_date.isoformat() if r.disembark_date else None,
                "status": r.status,
                "notes": r.notes,
            }
            for r in rows
        ],
    }


# ─── AMP-profile (kept for backward compat — delegates to seafarers table) ───
# The three routes below (this pair + update_profile) take a foreign
# seafarer_id (Handover.md nota 42, L-1/L-2). GET had no check at all; PATCH
# amp-profile only checked `role != "company"` — ANY approved-or-not company
# account could rewrite ANY seafarer's rank/CoC/endorsements. Verified the
# real call chain: "amp-profile" and "seafarers/{id}/profile" don't appear
# anywhere in src/ across either product's frontend or either admin panel —
# both have gated /seafarers/me/* siblings for actual self-service, and
# company.py has its own separate, relationship-checked routes for company
# access. No legitimate caller survives require_admin.

@router.get("/seafarers/{seafarer_id}/amp-profile", response_model=SeafarerAmpResponse)
def get_amp_profile(
    seafarer_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    seafarer = db.query(Seafarer).filter(Seafarer.id == seafarer_id).first()
    if not seafarer:
        raise HTTPException(status_code=404, detail="Seafarer not found")
    return seafarer


@router.patch("/seafarers/{seafarer_id}/amp-profile", response_model=SeafarerAmpResponse)
def update_amp_profile(
    seafarer_id: str,
    payload: SeafarerAmpUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    seafarer = db.query(Seafarer).filter(Seafarer.id == seafarer_id).first()
    if not seafarer:
        raise HTTPException(status_code=404, detail="Seafarer not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(seafarer, field, value)

    db.commit()
    db.refresh(seafarer)
    return seafarer


# ─── General profile update (by ID — kept for backward compat) ───────────────

@router.patch("/seafarers/{seafarer_id}/profile")
def update_profile(
    seafarer_id: str,
    payload: SeafarerProfileUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    seafarer = db.query(Seafarer).filter(Seafarer.id == seafarer_id).first()
    if not seafarer:
        raise HTTPException(status_code=404, detail="Seafarer not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if hasattr(seafarer, field):
            setattr(seafarer, field, value)
    db.commit()
    return {"ok": True, "id": seafarer_id}


# ─── Learning badge progress ─────────────────────────────────────────────────

_BADGE_QUERY = """
    SELECT slp.series_id, slp.status, slp.progress_pct, slp.completed_at,
           ls.badge_id, ls.title, ls.card_thumbnail
    FROM seafarer_learning_progress slp
    JOIN learning_series ls ON ls.id = slp.series_id
    WHERE slp.seafarer_id = :sid
    ORDER BY slp.enrolled_at ASC
"""


def _badge_rows_to_list(rows) -> list:
    return [
        {
            "series_id": r.series_id,
            "badge_id": r.badge_id,
            "title": r.title,
            "thumbnail": r.card_thumbnail,
            "status": r.status,
            "progress_pct": float(r.progress_pct or 0),
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        }
        for r in rows
    ]


@router.get("/seafarers/me/badges")
def get_my_badges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "seafarer":
        raise HTTPException(status_code=403, detail="Only seafarers have badges")
    rows = db.execute(text(_BADGE_QUERY), {"sid": current_user.id}).fetchall()
    return _badge_rows_to_list(rows)


@router.get("/seafarers/{seafarer_id}/badges")
def get_badges(
    seafarer_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.execute(text(_BADGE_QUERY), {"sid": seafarer_id}).fetchall()
    return _badge_rows_to_list(rows)


@router.post("/seafarers/{seafarer_id}/badges")
def upsert_badge(
    seafarer_id: str,
    payload: BadgeProgressUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    existing = db.execute(
        text("SELECT id, status FROM seafarer_learning_progress WHERE seafarer_id = :sid AND series_id = :ser"),
        {"sid": seafarer_id, "ser": payload.series_id}
    ).fetchone()

    if existing:
        update_data: dict = {
            "status": payload.status,
            "progress_pct": payload.progress_pct or 0,
            "sid": seafarer_id,
            "ser": payload.series_id,
        }
        if payload.last_watched_episode_id:
            update_data["ep"] = payload.last_watched_episode_id
            ep_clause = ", last_watched_episode_id = :ep"
        else:
            ep_clause = ""
        completed_clause = ", completed_at = :now" if payload.status == "completed" and existing.status != "completed" else ""
        if completed_clause:
            update_data["now"] = now
        db.execute(
            text(f"UPDATE seafarer_learning_progress SET status = :status, progress_pct = :progress_pct{ep_clause}{completed_clause} WHERE seafarer_id = :sid AND series_id = :ser"),
            update_data
        )
    else:
        prog_id = str(uuid.uuid4())
        db.execute(
            text("""
                INSERT INTO seafarer_learning_progress
                  (id, seafarer_id, series_id, status, progress_pct, last_watched_episode_id, enrolled_at)
                VALUES (:id, :sid, :ser, :status, :pct, :ep, :now)
            """),
            {
                "id": prog_id, "sid": seafarer_id, "ser": payload.series_id,
                "status": payload.status, "pct": payload.progress_pct or 0,
                "ep": payload.last_watched_episode_id, "now": now,
            }
        )

    db.commit()
    row = db.execute(
        text("""
            SELECT slp.series_id, slp.status, slp.progress_pct, slp.completed_at,
                   ls.badge_id, ls.title, ls.card_thumbnail
            FROM seafarer_learning_progress slp
            JOIN learning_series ls ON ls.id = slp.series_id
            WHERE slp.seafarer_id = :sid AND slp.series_id = :ser
        """),
        {"sid": seafarer_id, "ser": payload.series_id}
    ).fetchone()
    return {
        "series_id": row.series_id,
        "badge_id": row.badge_id,
        "title": row.title,
        "thumbnail": row.card_thumbnail,
        "status": row.status,
        "progress_pct": row.progress_pct,
        "completed_at": row.completed_at.isoformat() if row.completed_at else None,
    }
