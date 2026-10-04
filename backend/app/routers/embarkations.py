"""Embarkation verification — E-1 (Handover.md nota 63/66, spec at
docs/specs/EMBARQUES_MODELO_VERIFICACION.md).

Self-scoped seafarer routes (own token, never require_admin — same "self"
criterion as L-1/L-2) live alongside require_admin routes in this one file,
grouped by domain rather than by role, matching company.py's convention.
All state changes go through app.services.embarkation_service — nothing
here writes verification_status, verification_attempts, or a remark's
resolution directly.
"""
import mimetypes
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.embarkation import Embarkation, EmbarkationContactLog, EmbarkationRemark, EmbarkationVerificationEvent
from app.models.notification import Notification
from app.models.seafarer import Seafarer
from app.models.user import User
from app.services import embarkation_service as svc
from app.services import embarkation_storage

router = APIRouter()


def _service_error_to_http(exc: svc.EmbarkationError) -> HTTPException:
    if isinstance(exc, svc.InvalidTransition):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, svc.AttemptCapReached):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, svc.NotYetEligible):
        return HTTPException(status_code=422, detail=str(exc))
    return HTTPException(status_code=400, detail=str(exc))


def _embarkation_out(e: Embarkation) -> dict:
    return {
        "id": e.id,
        "seafarer_id": e.seafarer_id,
        "declared_vessel_name": e.declared_vessel_name,
        "declared_vessel_imo": e.declared_vessel_imo,
        "declared_company_name": e.declared_company_name,
        "declared_rank": e.declared_rank,
        "declared_date_from": e.declared_date_from.isoformat() if e.declared_date_from else None,
        "declared_date_to": e.declared_date_to.isoformat() if e.declared_date_to else None,
        "verified_vessel_name": e.verified_vessel_name,
        "verified_vessel_imo": e.verified_vessel_imo,
        "verified_company_name": e.verified_company_name,
        "verified_rank": e.verified_rank,
        "verified_date_from": e.verified_date_from.isoformat() if e.verified_date_from else None,
        "verified_date_to": e.verified_date_to.isoformat() if e.verified_date_to else None,
        "verification_status": e.verification_status,
        "status_reason": e.status_reason,
        "has_correction": e.has_correction,
        "verification_opened_at": e.verification_opened_at.isoformat() if e.verification_opened_at else None,
        "verification_deadline_at": e.verification_deadline_at.isoformat() if e.verification_deadline_at else None,
        "verification_attempts": e.verification_attempts,
        "verified_by": e.verified_by,
        "verified_at": e.verified_at.isoformat() if e.verified_at else None,
        "reverted_by": e.reverted_by,
        "reverted_at": e.reverted_at.isoformat() if e.reverted_at else None,
        "contact_consent": e.contact_consent,
        "contact_consent_at": e.contact_consent_at.isoformat() if e.contact_consent_at else None,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


def _remark_out(r: EmbarkationRemark) -> dict:
    return {
        "id": r.id,
        "subject_type": r.subject_type,
        "subject_id": r.subject_id,
        "field": r.field,
        "finding": r.finding,
        "created_by": r.created_by,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "appeal_text": r.appeal_text,
        "appealed_at": r.appealed_at.isoformat() if r.appealed_at else None,
        "resolution": r.resolution,
        "resolved_by": r.resolved_by,
        "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
    }


# ─── Seafarer self-service ────────────────────────────────────────────────────

class EmbarkationCreate(BaseModel):
    vessel_name: str
    vessel_imo: Optional[str] = None
    company_name: str
    rank: str
    date_from: date
    date_to: Optional[date] = None
    contact_consent: bool = False


class EmbarkationUpdate(BaseModel):
    vessel_name: Optional[str] = None
    vessel_imo: Optional[str] = None
    company_name: Optional[str] = None
    rank: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    contact_consent: Optional[bool] = None


def _get_own_embarkation_or_404(db: Session, embarkation_id: str, seafarer_id: str) -> Embarkation:
    """Same non-disclosure principle as company.py's _require_discoverable_or_hired:
    another seafarer's embarkation returns 404, never 403 — a 403 would
    confirm the id exists."""
    e = db.query(Embarkation).filter(Embarkation.id == embarkation_id).first()
    if e is None or e.seafarer_id != seafarer_id:
        raise HTTPException(status_code=404, detail="Embarkation not found")
    return e


@router.post("/seafarers/me/embarkations", status_code=201)
def create_embarkation(
    payload: EmbarkationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "seafarer":
        raise HTTPException(status_code=403, detail="Seafarer access required")
    e = Embarkation(
        seafarer_id=current_user.id,
        declared_vessel_name=payload.vessel_name,
        declared_vessel_imo=payload.vessel_imo,
        declared_company_name=payload.company_name,
        declared_rank=payload.rank,
        declared_date_from=payload.date_from,
        declared_date_to=payload.date_to,
        contact_consent=payload.contact_consent,
        contact_consent_at=svc.now() if payload.contact_consent else None,
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return _embarkation_out(e)


@router.get("/seafarers/me/embarkations")
def list_own_embarkations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "seafarer":
        raise HTTPException(status_code=403, detail="Seafarer access required")
    rows = (
        db.query(Embarkation)
        .filter(Embarkation.seafarer_id == current_user.id)
        .order_by(Embarkation.declared_date_from.desc())
        .all()
    )
    return {"items": [_embarkation_out(e) for e in rows]}


@router.get("/seafarers/me/embarkations/{embarkation_id}")
def get_own_embarkation(
    embarkation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    e = _get_own_embarkation_or_404(db, embarkation_id, current_user.id)
    remarks = db.query(EmbarkationRemark).filter(
        EmbarkationRemark.subject_type == "embarkation", EmbarkationRemark.subject_id == embarkation_id,
    ).order_by(EmbarkationRemark.created_at.asc()).all()
    out = _embarkation_out(e)
    out["remarks"] = [_remark_out(r) for r in remarks]
    return out


@router.patch("/seafarers/me/embarkations/{embarkation_id}")
def update_own_embarkation(
    embarkation_id: str,
    payload: EmbarkationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Allowed while 'declarado' (plain edit) or 'no_verificable'
    (2026-09-15, Rick nota 68 — see embarkation_service.edit_declared_fields
    for why: a no_verificable case means the shipping company never
    answered, not that the seafarer's own data was wrong, and it was
    otherwise a dead end nothing could ever fix). Refused once
    en_verificacion/verificado/observado."""
    _get_own_embarkation_or_404(db, embarkation_id, current_user.id)
    fields = {
        field: value
        for field in ("vessel_name", "vessel_imo", "company_name", "rank", "date_from", "date_to")
        if (value := getattr(payload, field)) is not None
    }
    try:
        e = svc.edit_declared_fields(
            db, embarkation_id, seafarer_id=current_user.id,
            fields=fields, contact_consent=payload.contact_consent,
        )
    except svc.EmbarkationError as exc:
        raise _service_error_to_http(exc)
    return _embarkation_out(e)


@router.delete("/seafarers/me/embarkations/{embarkation_id}", status_code=204)
def delete_own_embarkation(
    embarkation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    e = _get_own_embarkation_or_404(db, embarkation_id, current_user.id)
    if e.verification_status != "declarado":
        raise HTTPException(status_code=409, detail="Cannot delete an embarkation once its verification has started")
    db.delete(e)
    db.commit()


@router.post("/seafarers/me/embarkations/{embarkation_id}/request-verification")
def request_verification(
    embarkation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """"pedir que se verifique" (§1 decision 1: verification is bajo demanda,
    triggered by the seafarer or by a company's interest). This does NOT
    open the verification itself — only an admin can (the §5 matrix credits
    the "opened" event to an admin action) — it only tells admins someone is
    asking. Not one of the 8 rows in the §5 notification matrix; kept
    deliberately minimal (an admin-only notification, no embarkation state
    change) rather than expanding the matrix on my own — flagged in the
    Handover for the PM to confirm or correct."""
    e = _get_own_embarkation_or_404(db, embarkation_id, current_user.id)
    if e.verification_status != "declarado":
        raise HTTPException(status_code=409, detail="This embarkation is already being verified or concluded")
    if not e.contact_consent:
        raise HTTPException(status_code=422, detail="contact_consent is required before requesting verification")

    admin_ids = svc.admin_user_ids(db)
    seafarer_name = svc.seafarer_display_name(db, current_user.id)
    for admin_id in admin_ids:
        db.add(Notification(
            recipient_user_id=admin_id,
            recipient_scope="admin",
            kind="embarkation_verification_requested",
            subject_type="embarkation",
            subject_id=e.id,
            title="Un marino pidió verificar un embarque",
            body=f"{seafarer_name} pidió verificar su embarque en {e.declared_vessel_name} con {e.declared_company_name}.",
            requires_ack=False,
        ))
    db.commit()
    return {"ok": True, "detail": "Verification requested"}


@router.post("/seafarers/me/embarkation-remarks/{remark_id}/appeal")
def appeal_remark(
    remark_id: str,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appeal_text = (payload or {}).get("appeal_text", "")
    remark = svc.get_remark(db, remark_id)
    if remark is None or remark.subject_type != "embarkation":
        raise HTTPException(status_code=404, detail="Remark not found")
    embarkation = svc.get_embarkation(db, remark.subject_id)
    if embarkation is None or embarkation.seafarer_id != current_user.id:
        raise HTTPException(status_code=404, detail="Remark not found")
    try:
        remark = svc.appeal_remark(db, remark_id, seafarer_id=current_user.id, appeal_text=appeal_text)
    except svc.EmbarkationError as exc:
        raise _service_error_to_http(exc)
    return _remark_out(remark)


# ─── Admin pipeline ───────────────────────────────────────────────────────────

def _seafarer_identities(db: Session, seafarer_ids: list[str]) -> dict[str, dict]:
    """E-2 addition (Handover.md nota (30) del dev de Pollux) — the spec's `_embarkation_out`
    only carries `seafarer_id`, so the admin queue/detail views had no name
    or email to show without a second screen. Not a design change — same
    contract, an extra read. Single joined query, never N+1 per row."""
    if not seafarer_ids:
        return {}
    rows = (
        db.query(User.id, User.email, Seafarer.first_name, Seafarer.last_name)
        .join(Seafarer, Seafarer.id == User.id)
        .filter(User.id.in_(seafarer_ids))
        .all()
    )
    return {
        r.id: {"seafarer_email": r.email, "seafarer_first_name": r.first_name, "seafarer_last_name": r.last_name}
        for r in rows
    }


@router.get("/admin/embarkations")
def admin_list_embarkations(
    verification_status: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Embarkation)
    if verification_status:
        query = query.filter(Embarkation.verification_status == verification_status)
    rows = query.order_by(Embarkation.created_at.desc()).all()
    identities = _seafarer_identities(db, [e.seafarer_id for e in rows])
    items = []
    for e in rows:
        out = _embarkation_out(e)
        out.update(identities.get(e.seafarer_id, {"seafarer_email": None, "seafarer_first_name": None, "seafarer_last_name": None}))
        items.append(out)
    return {"items": items}


@router.get("/admin/embarkations/{embarkation_id}")
def admin_get_embarkation(
    embarkation_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    e = svc.get_embarkation(db, embarkation_id)
    if e is None:
        raise HTTPException(status_code=404, detail="Embarkation not found")
    contact_log = db.query(EmbarkationContactLog).filter(
        EmbarkationContactLog.embarkation_id == embarkation_id
    ).order_by(EmbarkationContactLog.attempt_no.asc()).all()
    events = db.query(EmbarkationVerificationEvent).filter(
        EmbarkationVerificationEvent.embarkation_id == embarkation_id
    ).order_by(EmbarkationVerificationEvent.created_at.asc()).all()
    remarks = db.query(EmbarkationRemark).filter(
        EmbarkationRemark.subject_type == "embarkation", EmbarkationRemark.subject_id == embarkation_id,
    ).order_by(EmbarkationRemark.created_at.asc()).all()

    out = _embarkation_out(e)
    out.update(_seafarer_identities(db, [e.seafarer_id]).get(
        e.seafarer_id, {"seafarer_email": None, "seafarer_first_name": None, "seafarer_last_name": None}
    ))
    out["contact_log"] = [
        {
            "id": c.id, "attempt_no": c.attempt_no,
            "contacted_at": c.contacted_at.isoformat() if c.contacted_at else None,
            "channel": c.channel, "phone_number_called": c.phone_number_called,
            "respondent_name": c.respondent_name, "respondent_position": c.respondent_position,
            "email_contacted": c.email_contacted, "attachment_ref": c.attachment_ref,
            "comments": c.comments, "actor_user_id": c.actor_user_id,
        }
        for c in contact_log
    ]
    out["events"] = [
        {
            "from_status": ev.from_status, "to_status": ev.to_status, "reason": ev.reason,
            "actor_user_id": ev.actor_user_id,
            "created_at": ev.created_at.isoformat() if ev.created_at else None,
        }
        for ev in events
    ]
    out["remarks"] = [_remark_out(r) for r in remarks]
    return out


class OpenVerificationRequest(BaseModel):
    triggering_company_id: Optional[str] = None


@router.post("/admin/embarkations/{embarkation_id}/open-verification")
def admin_open_verification(
    embarkation_id: str,
    payload: OpenVerificationRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        e = svc.open_verification(
            db, embarkation_id, actor_user_id=admin.id,
            triggering_company_id=payload.triggering_company_id,
        )
    except svc.EmbarkationError as exc:
        raise _service_error_to_http(exc)
    return _embarkation_out(e)


@router.post("/admin/embarkations/{embarkation_id}/reopen")
def admin_reopen(
    embarkation_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """E-2 addition (Handover.md nota (30) del dev de Pollux) — svc.reopen() (§2's
    'no_verificable -> en_verificacion cuando el marino aporta algo nuevo')
    existed in the service since E-1 but had no route, so the admin pipeline
    had no way to act on it. Same contract-gap category as
    _seafarer_identities: an extra endpoint, not a design change."""
    try:
        e = svc.reopen(db, embarkation_id, actor_user_id=admin.id)
    except svc.EmbarkationError as exc:
        raise _service_error_to_http(exc)
    return _embarkation_out(e)


@router.post("/admin/embarkations/{embarkation_id}/contact-attempts", status_code=201)
async def admin_record_contact_attempt(
    embarkation_id: str,
    channel: str = Form(...),
    contacted_at: Optional[str] = Form(None),
    phone_number_called: Optional[str] = Form(None),
    respondent_name: Optional[str] = Form(None),
    respondent_position: Optional[str] = Form(None),
    email_contacted: Optional[str] = Form(None),
    comments: Optional[str] = Form(None),
    attachment: Optional[UploadFile] = File(None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """The dropzone endpoint (§3) — attachment goes to GCS via
    embarkation_storage.store_attachment(), NEVER to the container disk
    (admin.py's _OCR_REF_DIR pattern is explicitly banned for this).

    2026-09-15 (Rick nota 68): can_record_contact_attempt() runs BEFORE any
    upload — the cap (attempt 11 rejected) is a designed path with its own
    test, not an edge case, so a rejected attempt must never reach GCS in
    the first place. Uploading first and deleting on failure was rejected on
    purpose: that leaves a window where the delete itself can also fail."""
    try:
        svc.can_record_contact_attempt(db, embarkation_id)
    except svc.EmbarkationError as exc:
        raise _service_error_to_http(exc)

    attachment_ref = None
    if attachment is not None and attachment.filename:
        content = await attachment.read()
        # GCS upload is blocking I/O — keep it off the event loop.
        attachment_ref = await run_in_threadpool(
            embarkation_storage.store_attachment,
            content, attachment.filename, attachment.content_type or "application/pdf",
        )
    parsed_contacted_at = datetime.fromisoformat(contacted_at) if contacted_at else None
    try:
        row = svc.record_contact_attempt(
            db, embarkation_id, actor_user_id=admin.id, channel=channel,
            contacted_at=parsed_contacted_at, phone_number_called=phone_number_called,
            respondent_name=respondent_name, respondent_position=respondent_position,
            email_contacted=email_contacted, attachment_ref=attachment_ref, comments=comments,
        )
    except svc.EmbarkationError as exc:
        raise _service_error_to_http(exc)
    return {
        "id": row.id, "attempt_no": row.attempt_no, "attachment_ref": row.attachment_ref,
    }


@router.get("/admin/embarkations/{embarkation_id}/contact-attempts/{attempt_id}/attachment")
def admin_get_contact_attempt_attachment(
    embarkation_id: str,
    attempt_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """E-2 addition (Handover.md nota (30) del dev de Pollux) — embarkation_storage.
    read_attachment() existed since E-1 (Task 2) but nothing exposed it over
    HTTP, so the dropzone had no way to show the admin what was actually
    uploaded for a past attempt. Same contract-gap category as
    _seafarer_identities and /reopen. attachment_ref never leaves the
    backend as a signed/public URL (embarkation_storage.py's own docstring:
    those expire or leak) — this streams the bytes through instead, same
    shape as GET /admin/ocr-reference-file."""
    row = db.query(EmbarkationContactLog).filter(
        EmbarkationContactLog.id == attempt_id, EmbarkationContactLog.embarkation_id == embarkation_id,
    ).first()
    if row is None or not row.attachment_ref:
        raise HTTPException(status_code=404, detail="Attachment not found")
    try:
        content = embarkation_storage.read_attachment(row.attachment_ref)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Attachment not found")
    content_type, _ = mimetypes.guess_type(row.attachment_ref)
    return Response(content=content, media_type=content_type or "application/octet-stream")


class ConcludeVerifiedRequest(BaseModel):
    outcome: str  # verificado | no_verificable | observado
    # verificado
    verified_fields: Optional[dict] = None
    # no_verificable
    reason: Optional[str] = None
    # observado
    field: Optional[str] = None
    finding: Optional[str] = None


@router.post("/admin/embarkations/{embarkation_id}/conclude")
def admin_conclude(
    embarkation_id: str,
    payload: ConcludeVerifiedRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        if payload.outcome == "verificado":
            e = svc.conclude_verified(db, embarkation_id, actor_user_id=admin.id, verified_fields=payload.verified_fields or {})
            return _embarkation_out(e)
        if payload.outcome == "no_verificable":
            if not payload.reason:
                raise HTTPException(status_code=422, detail="reason is required for outcome='no_verificable'")
            e = svc.conclude_no_verificable(db, embarkation_id, actor_user_id=admin.id, reason=payload.reason)
            return _embarkation_out(e)
        if payload.outcome == "observado":
            if not payload.field or not payload.finding:
                raise HTTPException(status_code=422, detail="field and finding are required for outcome='observado'")
            e, remark = svc.conclude_observado(db, embarkation_id, actor_user_id=admin.id, field=payload.field, finding=payload.finding)
            out = _embarkation_out(e)
            out["remark"] = _remark_out(remark)
            return out
        raise HTTPException(status_code=400, detail="outcome must be 'verificado', 'no_verificable', or 'observado'")
    except svc.EmbarkationError as exc:
        raise _service_error_to_http(exc)


class RevertRequest(BaseModel):
    cause: str  # no_verificable | observado
    reason: str
    field: Optional[str] = None
    finding: Optional[str] = None


@router.post("/admin/embarkations/{embarkation_id}/revert")
def admin_revert(
    embarkation_id: str,
    payload: RevertRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        e, remark = svc.revert_verified(
            db, embarkation_id, actor_user_id=admin.id, cause=payload.cause,
            reason=payload.reason, field=payload.field, finding=payload.finding,
        )
    except svc.EmbarkationError as exc:
        raise _service_error_to_http(exc)
    out = _embarkation_out(e)
    if remark is not None:
        out["remark"] = _remark_out(remark)
    return out


class ResolveRemarkRequest(BaseModel):
    resolution: str  # subsanado | sostenido


@router.patch("/admin/embarkation-remarks/{remark_id}/resolve")
def admin_resolve_remark(
    remark_id: str,
    payload: ResolveRemarkRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        remark = svc.resolve_remark(db, remark_id, actor_user_id=admin.id, resolution=payload.resolution)
    except svc.EmbarkationError as exc:
        raise _service_error_to_http(exc)
    return _remark_out(remark)


@router.post("/admin/embarkation-remarks/{remark_id}/mark-firm")
def admin_mark_remark_firm(
    remark_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        remark = svc.mark_remark_firm(db, remark_id, actor_user_id=admin.id)
    except svc.EmbarkationError as exc:
        raise _service_error_to_http(exc)
    return _remark_out(remark)
