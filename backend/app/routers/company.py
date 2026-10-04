import io
import uuid
import zipfile
import unicodedata
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.company import Company
from app.models.seafarer import Seafarer
from app.models.document import Document
from app.models.embarkation import Embarkation
from app.services.castor_files import CastorFetchError, fetch_castor_file
from app.services.compliance_engine import build_compliance_report

def _safe_slug(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text or "")
    ascii_str = nfkd.encode("ascii", "ignore").decode("ascii")
    return "".join(c if c.isalnum() else "_" for c in ascii_str).strip("_") or "unknown"


def _file_ext(file_name: str) -> str:
    if file_name and "." in file_name:
        return "." + file_name.rsplit(".", 1)[-1].lower()
    return ""


def _fetch_castor_file(user_id: str, saved_name: str):
    """Bytes of a seafarer's file, or None if it can't be fetched (the ZIP export
    skips it; castor_files already logged why)."""
    try:
        return fetch_castor_file(user_id, saved_name, service="pollux-company-proxy")[0]
    except CastorFetchError:
        return None


def _write_seafarer_docs(seafarer, docs, zf: zipfile.ZipFile, prefix: str = "") -> int:
    """Write verified docs for one seafarer into an open ZipFile. Returns count added."""
    added = 0
    seen = set()
    for doc in docs:
        if getattr(doc, "verification_status", None) != "verified":
            continue
        saved_name = getattr(doc, "saved_name", None)
        if not saved_name or saved_name in seen:
            continue
        content = _fetch_castor_file(seafarer.id, saved_name)
        if content is None:
            continue
        seen.add(saved_name)
        code_name = getattr(doc, "code_name", None)
        file_name = getattr(doc, "file_name", saved_name)
        ext = _file_ext(file_name)
        fname = f"{code_name}{ext}" if code_name else file_name
        cat = getattr(doc, "category_label", None) or getattr(doc, "category", None) or "Other Certificates"
        zf.writestr(f"{prefix}All Documents/{fname}", content)
        zf.writestr(f"{prefix}{cat}/{fname}", content)
        added += 1
    return added

router = APIRouter()

CATEGORY_LABELS = {
    "merchant": "Marina Mercante",
    "offshore": "Offshore / MOU",
    "fishing": "Pesquero",
    "yacht": "Yates / Recreo",
    "national": "Aguas Nacionales",
}


@router.get("/company/seafarers")
def list_seafarers(
    fleet_category: Optional[str] = None,
    rank: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_company(current_user, db)

    query = (
        db.query(Seafarer)
        .join(User, Seafarer.id == User.id)
        .filter(User.is_active == True)
        .filter(Seafarer.discoverable == True)
        # 2026-09-15 (Rick, nota 57/59): a company sharing a seafarer's
        # profile is the same "reaches a third party" moment company.py:425
        # already gates for the company's own email — an unverified seafarer
        # shouldn't reach discovery either.
        .filter(User.email_verified == True)
    )
    if fleet_category:
        query = query.filter(Seafarer.fleet_category == fleet_category)
    if rank:
        query = query.filter(Seafarer.rank == rank)

    seafarers = query.all()

    results = []
    for s in seafarers:
        docs = db.query(Document).filter(Document.seafarer_id == s.id).all()
        # Compliance score only counts admin-verified documents
        verified_docs = [d for d in docs if getattr(d, "verification_status", None) == "verified"]
        report = build_compliance_report(
            s.rank or "", verified_docs, db=db,
            coc_type=getattr(s, "coc_type", None),
            cop_tanker_type=getattr(s, "cop_tanker_type", None),
            cop_tanker_level=getattr(s, "cop_tanker_level", None),
            flag_endorsements=getattr(s, "flag_endorsements", None),
            special_endorsements=getattr(s, "special_endorsements", None),
            vessel_type_ids=getattr(s, "vessel_types", None),
        ) if s.rank else None
        verified_count = len(verified_docs)
        total_docs = len(docs)
        avatar_row = db.execute(
            text("SELECT avatar_b64 FROM users WHERE id = :uid"),
            {"uid": s.id}
        ).fetchone()
        avatar_b64 = avatar_row[0] if avatar_row and avatar_row[0] else None
        seafarer_code_row = db.execute(
            text("SELECT seafarer_code FROM users WHERE id = :uid"), {"uid": s.id}
        ).fetchone()
        results.append({
            "id": s.id,
            "seafarer_code": seafarer_code_row[0] if seafarer_code_row else None,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "nationality": s.nationality,
            "rank": s.rank,
            "fleet_category": s.fleet_category,
            "fleet_category_label": CATEGORY_LABELS.get(s.fleet_category or "", s.fleet_category or ""),
            "compliance_score": round(report.compliance_score * 100) if report else None,
            "can_be_listed": report.can_be_listed if report else None,
            "missing_count": report.missing_count if report else None,
            "verified_count": verified_count,
            "total_docs": total_docs,
            "avatar_b64": avatar_b64,
            "is_available": s.is_available,
            "years_experience": s.years_experience,
            "department": getattr(s, "department", None),
            "city": getattr(s, "city", None),
            "nationalities": getattr(s, "nationalities", None) or [],
            "phone": s.phone,
        })

    can_be_listed_count = sum(1 for r in results if r.get("can_be_listed"))
    by_category: dict = {}
    for r in results:
        cat = r["fleet_category"] or "unknown"
        by_category[cat] = by_category.get(cat, 0) + 1

    return {
        "seafarers": results,
        "stats": {
            "total": len(results),
            "can_be_listed": can_be_listed_count,
            "by_category": by_category,
        },
    }


@router.get("/company/seafarers/{seafarer_id}/export")
def export_seafarer(
    seafarer_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk file download for one seafarer — requires an active hire
    relationship (Rick, 2026-09-13): status is visible to any company via
    /company/seafarers, but the actual files only go to a company that has
    this seafarer as active staff. `export-all` (the whole-base ZIP with no
    relationship check at all) was removed outright, not gated — there is no
    legitimate "all documents of everyone" use case for a company account.

    No separate email_verified check (Rick, nota 57/59) — same reasoning as
    list_staff above: hire_seafarer gates it for the self-service path, and
    an admin who creates an active relationship by hand (admin.py) is a
    deliberate override, not a gap in this endpoint."""
    _require_company(current_user, db)

    seafarer = db.query(Seafarer).filter(Seafarer.id == seafarer_id).first()
    if not seafarer:
        raise HTTPException(status_code=404, detail="Seafarer not found")

    active_relationship = db.execute(text("""
        SELECT id FROM relationships
        WHERE company_id = :cid AND seafarer_id = :sid AND status = 'active'
    """), {"cid": current_user.company_id, "sid": seafarer_id}).fetchone()
    if not active_relationship:
        raise HTTPException(status_code=403, detail="Seafarer must be active staff to download their documents")

    docs = db.query(Document).filter(Document.seafarer_id == seafarer_id).all()

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        _write_seafarer_docs(seafarer, docs, zf, prefix="")

    buf.seek(0)
    rank_slug = _safe_slug(seafarer.rank or "Unknown")
    first_slug = _safe_slug(seafarer.first_name or "")
    last_slug = _safe_slug(seafarer.last_name or "")
    zip_name = f"{rank_slug}_{first_slug}_{last_slug}_dossier.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_name}"'},
    )


def _require_discoverable_or_hired(seafarer_id: str, seafarer, current_user: User, db: Session) -> None:
    """The list (`/company/seafarers`) filters on `discoverable`; these two
    by-id routes didn't (Handover.md nota 42, L-6) — a company that captured
    the UUID while the seafarer was visible kept full profile/CV access after
    the seafarer opted out. An active hire is still let through: the toggle is
    about *discovery*, not about a company's existing employment relationship.
    404, not 403 — same as an unknown id, so this doesn't reveal that a
    non-discoverable profile exists at all.

    2026-09-15 (Rick, nota 57/59): also requires the seafarer's own email to
    be verified, same reasoning as list_seafarers' filter — a company that
    already holds the UUID (captured before verification status changed, or
    guessed) shouldn't get by-id access to an unverified profile either.
    """
    verified_row = db.execute(
        text("SELECT email_verified FROM users WHERE id = :sid"), {"sid": seafarer_id}
    ).fetchone()
    if not verified_row or not verified_row.email_verified:
        raise HTTPException(status_code=404, detail="Seafarer not found")

    if seafarer.discoverable:
        return
    active_relationship = db.execute(text("""
        SELECT id FROM relationships
        WHERE company_id = :cid AND seafarer_id = :sid AND status = 'active'
    """), {"cid": current_user.company_id, "sid": seafarer_id}).fetchone()
    if not active_relationship:
        raise HTTPException(status_code=404, detail="Seafarer not found")


@router.get("/company/seafarers/{seafarer_id}")
def get_seafarer_profile(
    seafarer_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_company(current_user, db)

    seafarer = db.query(Seafarer).filter(Seafarer.id == seafarer_id).first()
    if not seafarer:
        raise HTTPException(status_code=404, detail="Seafarer not found")
    _require_discoverable_or_hired(seafarer_id, seafarer, current_user, db)

    docs = db.query(Document).filter(Document.seafarer_id == seafarer_id).all()
    verified_docs = [d for d in docs if getattr(d, "verification_status", None) == "verified"]
    report = build_compliance_report(
        seafarer.rank or "", verified_docs, db=db,
        coc_type=getattr(seafarer, "coc_type", None),
        cop_tanker_type=getattr(seafarer, "cop_tanker_type", None),
        cop_tanker_level=getattr(seafarer, "cop_tanker_level", None),
        flag_endorsements=getattr(seafarer, "flag_endorsements", None),
        special_endorsements=getattr(seafarer, "special_endorsements", None),
        vessel_type_ids=getattr(seafarer, "vessel_types", None),
    ) if seafarer.rank else None

    avatar_row = db.execute(
        text("SELECT avatar_b64 FROM users WHERE id = :uid"),
        {"uid": seafarer.id}
    ).fetchone()
    avatar_b64 = avatar_row[0] if avatar_row and avatar_row[0] else None

    badge_rows = db.execute(
        text("""
            SELECT slp.series_id, slp.status, slp.progress_pct, slp.completed_at,
                   ls.badge_id, ls.title, ls.card_thumbnail
            FROM seafarer_learning_progress slp
            JOIN learning_series ls ON ls.id = slp.series_id
            WHERE slp.seafarer_id = :sid AND slp.status = 'completed'
            ORDER BY slp.completed_at DESC
        """),
        {"sid": seafarer_id}
    ).fetchall()

    badges = [
        {
            "badge_id": r.badge_id,
            "title": r.title,
            "thumbnail": r.card_thumbnail,
            "status": r.status,
            "progress_pct": r.progress_pct,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        }
        for r in badge_rows
    ]

    seafarer_code_row = db.execute(
        text("SELECT seafarer_code FROM users WHERE id = :uid"), {"uid": seafarer.id}
    ).fetchone()
    return {
        "id": seafarer.id,
        "seafarer_code": seafarer_code_row[0] if seafarer_code_row else None,
        "first_name": seafarer.first_name,
        "last_name": seafarer.last_name,
        "nationality": seafarer.nationality,
        "rank": seafarer.rank,
        "fleet_category": seafarer.fleet_category,
        "years_experience": seafarer.years_experience,
        "bio": seafarer.bio,
        "is_available": seafarer.is_available,
        "coc_type": seafarer.coc_type,
        "coc_issuing_country": seafarer.coc_issuing_country,
        "flag_endorsements": seafarer.flag_endorsements or [],
        "special_endorsements": seafarer.special_endorsements or [],
        "compliance_score": round(report.compliance_score * 100) if report else None,
        "can_be_listed": report.can_be_listed if report else None,
        "missing_count": report.missing_count if report else None,
        "is_fully_compliant": report.is_fully_compliant if report else None,
        "documents": [
            {
                "id": d.id,
                "name": d.name,
                "cert_code": d.cert_code,
                "verification_status": d.verification_status or "pending",
                "rejection_reason": d.rejection_reason,
                "expiry_date": d.expiry_date.isoformat() if d.expiry_date else None,
                "issued_date": d.issued_date.isoformat() if d.issued_date else None,
                "verified_at": d.verified_at.isoformat() if getattr(d, "verified_at", None) else None,
                "registry_result": getattr(d, "registry_result", None),
            }
            for d in docs
        ],
        "compliance_docs": [
            {
                "name": item.name,
                "cert": item.cert,
                "level": item.level,
                "state": item.state,
                "expiry_date": item.expiry_date.isoformat() if item.expiry_date else None,
                "days_remaining": item.days_remaining,
            }
            for item in (report.docs if report else [])
        ],
        "avatar_b64": avatar_b64,
        "department": getattr(seafarer, "department", None),
        "city": getattr(seafarer, "city", None),
        "nationalities": getattr(seafarer, "nationalities", None) or [],
        "phone": seafarer.phone,
        "date_of_birth": str(seafarer.date_of_birth) if seafarer.date_of_birth else None,
        "cop_tanker_type": seafarer.cop_tanker_type,
        "cop_tanker_level": seafarer.cop_tanker_level,
        "coc_tonnage_limit": seafarer.coc_tonnage_limit,
        "vessel_types": seafarer.vessel_types,
        "spoken_languages": seafarer.spoken_languages,
        "badges": badges,
    }


@router.get("/company/seafarers/{seafarer_id}/cv")
def download_seafarer_cv(
    seafarer_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Renders the admin-edited CV template with this seafarer's real data
    and returns it as a downloadable PDF. Same access rule as the profile
    view above (Handover.md nota 42, L-6): any approved company can pull a
    candidate's CV, but only while the seafarer is discoverable or the
    company has an active hire relationship with them."""
    _require_company(current_user, db)

    seafarer = db.query(Seafarer).filter(Seafarer.id == seafarer_id).first()
    if not seafarer:
        raise HTTPException(status_code=404, detail="Seafarer not found")
    _require_discoverable_or_hired(seafarer_id, seafarer, current_user, db)

    from app.services.cv_generator import build_context, render_template, html_to_pdf

    docs = db.query(Document).filter(Document.seafarer_id == seafarer_id).all()
    seafarer_code_row = db.execute(
        text("SELECT seafarer_code FROM users WHERE id = :uid"), {"uid": seafarer_id}
    ).fetchone()
    seafarer.seafarer_code = seafarer_code_row[0] if seafarer_code_row else None

    tpl_row = db.execute(text(
        "SELECT html_template, logo_b64, accent_color FROM cv_templates WHERE id = 'default'"
    )).fetchone()
    if not tpl_row:
        raise HTTPException(status_code=500, detail="CV template not configured")

    context = build_context(seafarer, docs)
    rendered_html = render_template(tpl_row.html_template, context, tpl_row.logo_b64, tpl_row.accent_color)
    pdf_bytes = html_to_pdf(rendered_html)

    safe_name = _safe_slug(f"{seafarer.first_name or ''}_{seafarer.last_name or ''}") or seafarer_id
    from fastapi.responses import Response as _Response
    return _Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="CV_{safe_name}.pdf"'},
    )


@router.get("/company/seafarers/{seafarer_id}/embarkations")
def list_seafarer_embarkations_for_company(
    seafarer_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """E-4 (Handover.md nota 63/75) — the naviera's read of a seafarer's
    embarkation history. §2 of the spec: what she sees differs by status,
    and the whole point of this endpoint is to enforce that server-side
    instead of trusting the frontend to hide fields.

    Deliberately excludes everything that isn't "the status" per Rick's
    order on the (75) review: no contact_log, no events, no remarks, no
    verification_attempts, no verified_by/reverted_by, no
    verification_opened_at/deadline_at. `status_reason` is the one field
    that's conditionally exposed, and only for 'no_verificable' — the spec
    says the naviera gets that reason in plain language (it's about HER
    silence, not a finding about the seafarer). For 'observado' the reason
    column literally contains the remark's field name
    (conclude_observado() writes reason=f"Información encontrada falsa:
    {field}") — exposing it here would leak exactly what §2/§4 forbid, so
    it's withheld for every status except 'no_verificable', not just for
    'observado'.

    Same access gate as the profile/CV routes above (discoverable or
    actively hired, email verified)."""
    _require_company(current_user, db)

    seafarer = db.query(Seafarer).filter(Seafarer.id == seafarer_id).first()
    if not seafarer:
        raise HTTPException(status_code=404, detail="Seafarer not found")
    _require_discoverable_or_hired(seafarer_id, seafarer, current_user, db)

    rows = (
        db.query(Embarkation)
        .filter(Embarkation.seafarer_id == seafarer_id)
        .order_by(Embarkation.declared_date_from.desc())
        .all()
    )

    def _out(e: Embarkation) -> dict:
        return {
            "id": e.id,
            "vessel_name": e.verified_vessel_name or e.declared_vessel_name,
            "company_name": e.verified_company_name or e.declared_company_name,
            "rank": e.verified_rank or e.declared_rank,
            "date_from": (e.verified_date_from or e.declared_date_from).isoformat()
                if (e.verified_date_from or e.declared_date_from) else None,
            "date_to": (e.verified_date_to or e.declared_date_to).isoformat()
                if (e.verified_date_to or e.declared_date_to) else None,
            "verification_status": e.verification_status,
            "status_reason": e.status_reason if e.verification_status == "no_verificable" else None,
        }

    return {"items": [_out(e) for e in rows]}


# ─── Mi Flota — Module 1: Staff (hire) ───────────────────────────────────────
# Two-step model (Rick, 2026-09-12): hiring a seafarer creates the company↔seafarer
# link (they become "staff") independent of any vessel; assigning them to a ship
# is a separate, later step (see the vessels/assignments endpoints below). This is
# the first real write path from the company side into `relationships` — until now
# that table was only ever written by the admin panel's manual "+ New" button.

def _require_company(user: User, db: Session) -> None:
    """The real endpoint gate (Rick, 2026-09-14): role alone used to be
    enough, which let any self-registered, unverified account see and export
    seafarer data. Now also requires the company to be admin-approved AND
    the account's email verified — see routers/auth.py's register/verify-email
    and admin.py's approve/reject endpoints."""
    if user.role != "company":
        raise HTTPException(status_code=403, detail="Company access required")
    company = db.query(Company).filter(Company.id == user.company_id).first()
    if not company or company.company_status != "approved":
        raise HTTPException(status_code=403, detail="Company account is pending approval")
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Email not verified")


class HireRequest(BaseModel):
    seafarer_id: str
    notes: Optional[str] = None


class StaffStatusPatch(BaseModel):
    status: str  # active | ended


@router.get("/company/staff")
def list_staff(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """No email_verified check here (Rick, nota 57/59): hire_seafarer below
    already requires it for every relationship a company creates itself, and
    email_verified never reverts to False — so a self-service relationship
    listed here is always for an already-verified seafarer. This is NOT
    "an active relationship implies verified" as a general fact — it isn't:
    admin.py's POST /relationships + PATCH /relationships/{id} can create an
    active relationship for an unverified seafarer, on purpose (an admin
    override, see the comments there). It's specifically that THIS route's
    only write path (hire_seafarer) is gated."""
    _require_company(current_user, db)
    rows = db.execute(text("""
        SELECT r.id, r.seafarer_id, r.status, r.notes, r.created_at,
               s.first_name, s.last_name, s.rank, s.fleet_category
        FROM relationships r
        JOIN seafarers s ON s.id = r.seafarer_id
        WHERE r.company_id = :cid
        ORDER BY r.created_at DESC
    """), {"cid": current_user.company_id}).fetchall()

    return {
        "items": [
            {
                "id": r.id,
                "seafarer_id": r.seafarer_id,
                "name": f"{r.first_name or ''} {r.last_name or ''}".strip(),
                "rank": r.rank,
                "fleet_category": r.fleet_category,
                "status": r.status,
                "notes": r.notes,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


@router.post("/company/staff", status_code=201)
def hire_seafarer(
    payload: HireRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_company(current_user, db)

    seafarer = db.execute(text("""
        SELECT s.id, u.email_verified FROM seafarers s
        JOIN users u ON u.id = s.id
        WHERE s.id = :sid
    """), {"sid": payload.seafarer_id}).fetchone()
    if not seafarer:
        raise HTTPException(status_code=404, detail="Seafarer not found")
    if not seafarer.email_verified:
        # 2026-09-15 (Rick, nota 57/59): the real gate for this whole family
        # of routes — without this, a company could hire (by id) a
        # non-discoverable, unverified seafarer, then see them anyway via
        # _require_discoverable_or_hired's "hired" branch. Same 404 as an
        # unknown id, same non-disclosure principle as that function.
        raise HTTPException(status_code=404, detail="Seafarer not found")

    existing = db.execute(text("""
        SELECT id FROM relationships WHERE company_id = :cid AND seafarer_id = :sid
    """), {"cid": current_user.company_id, "sid": payload.seafarer_id}).fetchone()

    now = datetime.now(timezone.utc)
    if existing:
        db.execute(text("""
            UPDATE relationships SET status = 'active', notes = COALESCE(:notes, notes), updated_at = :now
            WHERE id = :id
        """), {"notes": payload.notes, "now": now, "id": existing.id})
        db.commit()
        return {"id": existing.id, "status": "active"}

    new_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO relationships (id, company_id, seafarer_id, status, notes, created_at, updated_at)
        VALUES (:id, :cid, :sid, 'active', :notes, :now, :now)
    """), {"id": new_id, "cid": current_user.company_id, "sid": payload.seafarer_id,
          "notes": payload.notes, "now": now})
    db.commit()
    return {"id": new_id, "status": "active"}


@router.patch("/company/staff/{relationship_id}")
def update_staff_status(
    relationship_id: str,
    payload: StaffStatusPatch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_company(current_user, db)
    if payload.status not in ("active", "ended"):
        raise HTTPException(status_code=400, detail="status must be active | ended")

    now = datetime.now(timezone.utc)
    result = db.execute(text("""
        UPDATE relationships SET status = :status, updated_at = :now
        WHERE id = :id AND company_id = :cid RETURNING id
    """), {"status": payload.status, "now": now, "id": relationship_id, "cid": current_user.company_id}).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Staff member not found")
    db.commit()
    return {"id": relationship_id, "status": payload.status}


# ─── Mi Flota — Module 2: Vessels ────────────────────────────────────────────

class VesselCreate(BaseModel):
    name: str
    vessel_type: Optional[str] = None
    flag_country: Optional[str] = None
    imo_number: Optional[str] = None
    mmsi_number: Optional[str] = None
    crew_capacity: Optional[int] = None
    photo_b64: Optional[str] = None


class VesselPatch(BaseModel):
    name: Optional[str] = None
    vessel_type: Optional[str] = None
    flag_country: Optional[str] = None
    imo_number: Optional[str] = None
    mmsi_number: Optional[str] = None
    crew_capacity: Optional[int] = None
    photo_b64: Optional[str] = None
    is_active: Optional[bool] = None


def _vessel_row_to_dict(v) -> dict:
    return {
        "id": v.id,
        "name": v.name,
        "vessel_type": v.vessel_type,
        "vessel_type_label": CATEGORY_LABELS.get(v.vessel_type or "", v.vessel_type or ""),
        "flag_country": v.flag_country,
        "imo_number": v.imo_number,
        "mmsi_number": v.mmsi_number,
        "crew_capacity": v.crew_capacity,
        "photo_b64": v.photo_b64,
        "is_active": v.is_active,
        "created_at": v.created_at.isoformat() if v.created_at else None,
    }


@router.get("/company/vessels")
def list_vessels(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_company(current_user, db)
    rows = db.execute(text("""
        SELECT id, name, vessel_type, flag_country, imo_number, mmsi_number,
               crew_capacity, photo_b64, is_active, created_at
        FROM vessels WHERE company_id = :cid AND is_active = TRUE ORDER BY created_at DESC
    """), {"cid": current_user.company_id}).fetchall()
    return {"items": [_vessel_row_to_dict(v) for v in rows]}


@router.post("/company/vessels", status_code=201)
def create_vessel(
    payload: VesselCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_company(current_user, db)
    new_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    db.execute(text("""
        INSERT INTO vessels (id, company_id, name, vessel_type, flag_country, imo_number,
                              mmsi_number, crew_capacity, photo_b64, is_active, created_at, updated_at)
        VALUES (:id, :cid, :name, :vtype, :flag, :imo, :mmsi, :cap, :photo, TRUE, :now, :now)
    """), {
        "id": new_id, "cid": current_user.company_id, "name": payload.name,
        "vtype": payload.vessel_type, "flag": payload.flag_country, "imo": payload.imo_number,
        "mmsi": payload.mmsi_number, "cap": payload.crew_capacity, "photo": payload.photo_b64, "now": now,
    })
    db.commit()
    return {"id": new_id}


@router.patch("/company/vessels/{vessel_id}")
def update_vessel(
    vessel_id: str,
    payload: VesselPatch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_company(current_user, db)
    owned = db.execute(text("SELECT id FROM vessels WHERE id = :id AND company_id = :cid"),
                        {"id": vessel_id, "cid": current_user.company_id}).fetchone()
    if not owned:
        raise HTTPException(status_code=404, detail="Vessel not found")

    fields = payload.dict(exclude_unset=True)
    if not fields:
        return {"id": vessel_id}
    set_clause = ", ".join(f"{k} = :{k}" for k in fields)
    fields.update({"id": vessel_id, "now": datetime.now(timezone.utc)})
    db.execute(text(f"UPDATE vessels SET {set_clause}, updated_at = :now WHERE id = :id"), fields)
    db.commit()
    return {"id": vessel_id}


@router.delete("/company/vessels/{vessel_id}", status_code=204)
def delete_vessel(
    vessel_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_company(current_user, db)
    now = datetime.now(timezone.utc)
    result = db.execute(text("""
        UPDATE vessels SET is_active = FALSE, updated_at = :now
        WHERE id = :id AND company_id = :cid RETURNING id
    """), {"now": now, "id": vessel_id, "cid": current_user.company_id}).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Vessel not found")
    db.commit()


# ─── Mi Flota — Module 3: Crew assignments (rotations) ──────────────────────

class AssignmentCreate(BaseModel):
    seafarer_id: str
    rank: str
    embark_date: date
    disembark_date: Optional[date] = None
    notes: Optional[str] = None


class AssignmentPatch(BaseModel):
    rank: Optional[str] = None
    embark_date: Optional[date] = None
    disembark_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None


def _assignment_row_to_dict(a) -> dict:
    return {
        "id": a.id,
        "vessel_id": a.vessel_id,
        "seafarer_id": a.seafarer_id,
        "seafarer_name": f"{a.first_name or ''} {a.last_name or ''}".strip(),
        "rank": a.rank,
        "embark_date": a.embark_date.isoformat() if a.embark_date else None,
        "disembark_date": a.disembark_date.isoformat() if a.disembark_date else None,
        "status": a.status,
        "notes": a.notes,
    }


@router.get("/company/vessels/{vessel_id}/assignments")
def list_assignments(
    vessel_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_company(current_user, db)
    owned = db.execute(text("SELECT id FROM vessels WHERE id = :id AND company_id = :cid"),
                        {"id": vessel_id, "cid": current_user.company_id}).fetchone()
    if not owned:
        raise HTTPException(status_code=404, detail="Vessel not found")

    rows = db.execute(text("""
        SELECT a.id, a.vessel_id, a.seafarer_id, a.rank, a.embark_date, a.disembark_date,
               a.status, a.notes, s.first_name, s.last_name
        FROM crew_assignments a
        JOIN seafarers s ON s.id = a.seafarer_id
        WHERE a.vessel_id = :vid
        ORDER BY a.embark_date DESC
    """), {"vid": vessel_id}).fetchall()
    return {"items": [_assignment_row_to_dict(a) for a in rows]}


@router.post("/company/vessels/{vessel_id}/assignments", status_code=201)
def create_assignment(
    vessel_id: str,
    payload: AssignmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_company(current_user, db)
    owned = db.execute(text("SELECT id FROM vessels WHERE id = :id AND company_id = :cid"),
                        {"id": vessel_id, "cid": current_user.company_id}).fetchone()
    if not owned:
        raise HTTPException(status_code=404, detail="Vessel not found")

    # Must already be hired staff — enforces the two-step hire → assign model.
    staff = db.execute(text("""
        SELECT id FROM relationships
        WHERE company_id = :cid AND seafarer_id = :sid AND status = 'active'
    """), {"cid": current_user.company_id, "sid": payload.seafarer_id}).fetchone()
    if not staff:
        raise HTTPException(status_code=400, detail="Seafarer must be hired staff before being assigned to a vessel")

    # Conflict check: no two crew members covering the same rank on the same vessel
    # for overlapping dates. Both sides of the range treat a NULL disembark_date as
    # open-ended ('infinity') — otherwise a permanent rotation would silently escape
    # the check, which is exactly the case that matters most.
    conflict = db.execute(text("""
        SELECT a.id, s.first_name, s.last_name
        FROM crew_assignments a
        JOIN seafarers s ON s.id = a.seafarer_id
        WHERE a.vessel_id = :vid AND a.rank = :rank
          AND a.status NOT IN ('cancelled', 'completed')
          AND a.embark_date <= COALESCE(:new_disembark, 'infinity'::date)
          AND :new_embark <= COALESCE(a.disembark_date, 'infinity'::date)
    """), {
        "vid": vessel_id, "rank": payload.rank,
        "new_embark": payload.embark_date, "new_disembark": payload.disembark_date,
    }).fetchone()
    if conflict:
        name = f"{conflict.first_name or ''} {conflict.last_name or ''}".strip()
        raise HTTPException(status_code=409, detail=f"{name} already covers {payload.rank} on this vessel for an overlapping period")

    new_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    db.execute(text("""
        INSERT INTO crew_assignments (id, vessel_id, seafarer_id, company_id, rank,
                                       embark_date, disembark_date, status, notes, created_at, updated_at)
        VALUES (:id, :vid, :sid, :cid, :rank, :embark, :disembark, 'scheduled', :notes, :now, :now)
    """), {
        "id": new_id, "vid": vessel_id, "sid": payload.seafarer_id, "cid": current_user.company_id,
        "rank": payload.rank, "embark": payload.embark_date, "disembark": payload.disembark_date,
        "notes": payload.notes, "now": now,
    })
    db.commit()
    return {"id": new_id, "status": "scheduled"}


@router.patch("/company/assignments/{assignment_id}")
def update_assignment(
    assignment_id: str,
    payload: AssignmentPatch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_company(current_user, db)
    owned = db.execute(text("""
        SELECT a.id FROM crew_assignments a WHERE a.id = :id AND a.company_id = :cid
    """), {"id": assignment_id, "cid": current_user.company_id}).fetchone()
    if not owned:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if payload.status is not None and payload.status not in ("scheduled", "aboard", "completed", "cancelled"):
        raise HTTPException(status_code=400, detail="invalid status")

    fields = payload.dict(exclude_unset=True)
    if not fields:
        return {"id": assignment_id}
    set_clause = ", ".join(f"{k} = :{k}" for k in fields)
    fields.update({"id": assignment_id, "now": datetime.now(timezone.utc)})
    db.execute(text(f"UPDATE crew_assignments SET {set_clause}, updated_at = :now WHERE id = :id"), fields)
    db.commit()
    return {"id": assignment_id}
