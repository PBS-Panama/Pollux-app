"""The embarkation verification state machine and its hard rules
(docs/specs/EMBARQUES_MODELO_VERIFICACION.md §1-§6; E-1, Task 1).

Every rule below has to live HERE, not in a router — an endpoint that writes
`verification_status` directly, or increments `verification_attempts` by
hand, or resets it on reopen, reintroduces exactly the bug this module
exists to prevent. Callers only ever use the named operations at the bottom
of this file (open_verification, record_contact_attempt, conclude_*,
revert_verified, reopen) — there is no generic "set_status(id, status)".

The state machine (§2):

    declarado --------------> en_verificacion
                                  |   |   |
                       verificado |   |   | no_verificable
                                  v   |   v
                                  |   |  (30 días Y >=5 intentos)
                                  |   +----> observado
                                  v
                              verificado
                             /          \\
              no_verificable            observado      (reversión — sin
                                                          la condición de arriba)
    no_verificable --------> en_verificacion             (reapertura)
    observado --------------> (sin transición definida en el doc)
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.embarkation import (
    Embarkation,
    EmbarkationContactLog,
    EmbarkationRemark,
    EmbarkationVerificationEvent,
)
from app.models.notification import Notification
from app.services import notification_dispatch

_VERIFICATION_WINDOW = timedelta(days=30)
_MIN_ATTEMPTS_FOR_NO_VERIFICABLE = 5
_MAX_ATTEMPTS = 10

# The only place the state machine is defined. _apply_transition() is the
# only function allowed to write embarkations.verification_status, and it
# checks every write against this table — there is no path that bypasses it.
#
# no_verificable -> declarado (2026-09-15, Rick nota 68) is the seafarer
# correcting their own declared data: no_verificable means the shipping
# company never answered — it says nothing about whether what the seafarer
# typed was right. Without this exit, a typo made it into a state nothing
# could ever fix (reopening is an admin action; observado has the appeal,
# no_verificable had nothing). See edit_declared_fields() below — it's the
# only caller that produces this transition.
_ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "declarado": {"en_verificacion"},
    "en_verificacion": {"verificado", "no_verificable", "observado"},
    "verificado": {"no_verificable", "observado"},
    "no_verificable": {"en_verificacion", "declarado"},
    "observado": set(),
}

_DECLARED_VERIFIED_FIELDS = (
    "vessel_name", "vessel_imo", "company_name", "rank", "date_from", "date_to",
)


class EmbarkationError(Exception):
    """Base class for a rule violation — callers (routers) translate this to
    an HTTP error; this module stays HTTP-agnostic on purpose."""


class InvalidTransition(EmbarkationError):
    pass


class AttemptCapReached(EmbarkationError):
    pass


class NotYetEligible(EmbarkationError):
    pass


def now() -> datetime:
    return datetime.now(timezone.utc)


def get_embarkation(db: Session, embarkation_id: str) -> Optional[Embarkation]:
    return db.query(Embarkation).filter(Embarkation.id == embarkation_id).first()


def _differs_from_declared(embarkation: Embarkation) -> bool:
    for field in _DECLARED_VERIFIED_FIELDS:
        verified = getattr(embarkation, f"verified_{field}")
        if verified is not None and verified != getattr(embarkation, f"declared_{field}"):
            return True
    return False


def _active_company_ids(db: Session, seafarer_id: str) -> list[str]:
    rows = db.execute(text("""
        SELECT DISTINCT company_id FROM relationships
        WHERE seafarer_id = :sid AND status = 'active'
    """), {"sid": seafarer_id}).fetchall()
    return [r.company_id for r in rows]


def _company_user_ids(db: Session, company_id: str) -> list[str]:
    rows = db.execute(text("SELECT id FROM users WHERE company_id = :cid"), {"cid": company_id}).fetchall()
    return [r.id for r in rows]


def admin_user_ids(db: Session) -> list[str]:
    rows = db.execute(text("SELECT id FROM users WHERE role = 'admin'")).fetchall()
    return [r.id for r in rows]


def _notify(
    db: Session,
    *,
    kind: str,
    subject_type: str,
    subject_id: str,
    context: dict,
    seafarer_id: Optional[str] = None,
    admin: bool = False,
    company_ids: Optional[list[str]] = None,
) -> None:
    """Create one Notification row per (recipient, scope) — text AND
    requires_ack rendered per (kind, scope), never a single title/body/ack
    flag copied to everyone. 2026-09-16 (Rick nota 75): requires_ack used to
    be computed once per kind for the whole recipient list — that put the
    naviera's acuse on the marino and the admin too, for an event neither of
    them has any acknowledgement UI for. Compute it per recipient's scope,
    same as the text.
    """
    recipients: list[tuple[str, str, Optional[str]]] = []  # (user_id, scope, company_id)

    if seafarer_id is not None:
        recipients.append((seafarer_id, "seafarer", None))
    if admin:
        recipients.extend((uid, "admin", None) for uid in admin_user_ids(db))
    for cid in (company_ids or []):
        recipients.extend((uid, "company", cid) for uid in _company_user_ids(db, cid))

    for user_id, scope, company_id in recipients:
        title, body = notification_dispatch.render(kind, scope, context)
        db.add(Notification(
            recipient_user_id=user_id,
            recipient_scope=scope,
            company_id=company_id,
            kind=kind,
            subject_type=subject_type,
            subject_id=subject_id,
            title=title,
            body=body,
            requires_ack=notification_dispatch.requires_ack(kind, scope),
        ))


def _apply_transition(
    db: Session,
    embarkation: Embarkation,
    to_status: str,
    *,
    reason: Optional[str],
    actor_user_id: str,
) -> None:
    from_status = embarkation.verification_status
    allowed = _ALLOWED_TRANSITIONS.get(from_status, set())
    if to_status not in allowed:
        raise InvalidTransition(
            f"'{from_status}' -> '{to_status}' is not a transition in the state "
            f"machine (allowed from '{from_status}': {sorted(allowed) or 'none'})"
        )
    embarkation.verification_status = to_status
    if reason is not None:
        embarkation.status_reason = reason
    db.add(EmbarkationVerificationEvent(
        embarkation_id=embarkation.id,
        from_status=from_status,
        to_status=to_status,
        reason=reason,
        actor_user_id=actor_user_id,
    ))


def _vessel_name(e: Embarkation) -> str:
    return e.verified_vessel_name or e.declared_vessel_name


def _company_name(e: Embarkation) -> str:
    return e.verified_company_name or e.declared_company_name


def seafarer_display_name(db: Session, seafarer_id: str) -> str:
    row = db.execute(text(
        "SELECT first_name, last_name FROM seafarers WHERE id = :id"
    ), {"id": seafarer_id}).fetchone()
    if not row:
        return seafarer_id
    return f"{row.first_name or ''} {row.last_name or ''}".strip() or seafarer_id


# ─── Public operations — one per transition, no generic setter ──────────────

def open_verification(
    db: Session,
    embarkation_id: str,
    *,
    actor_user_id: str,
    triggering_company_id: Optional[str] = None,
) -> Embarkation:
    """declarado -> en_verificacion. Starts the 30-day clock. Only the
    company that triggered this (if any) gets the "opened" notification —
    other companies with an active relationship find out when it concludes."""
    embarkation = get_embarkation(db, embarkation_id)
    if embarkation is None:
        raise EmbarkationError("embarkation not found")

    opened_at = now()
    embarkation.verification_opened_at = opened_at
    embarkation.verification_deadline_at = opened_at + _VERIFICATION_WINDOW
    _apply_transition(db, embarkation, "en_verificacion", reason=None, actor_user_id=actor_user_id)

    ctx = {
        "seafarer_name": seafarer_display_name(db, embarkation.seafarer_id),
        "vessel_name": _vessel_name(embarkation),
        "company_name": _company_name(embarkation),
    }
    _notify(
        db, kind="embarkation_verification_opened", subject_type="embarkation",
        subject_id=embarkation.id, context=ctx, seafarer_id=embarkation.seafarer_id,
        admin=True, company_ids=[triggering_company_id] if triggering_company_id else [],
    )
    db.commit()
    db.refresh(embarkation)
    return embarkation


def edit_declared_fields(
    db: Session,
    embarkation_id: str,
    *,
    seafarer_id: str,
    fields: dict,
    contact_consent: Optional[bool] = None,
) -> Embarkation:
    """The seafarer edits their own declared_* data, and/or contact_consent
    (2026-09-15, Rick nota 68). Allowed while 'declarado' (plain edit, no
    state change) or 'no_verificable' — the latter means the shipping
    company never answered, which says nothing about whether the seafarer's
    own data was right, and it was otherwise a dead end (reopening is an
    admin action; observado has the appeal path, no_verificable had none).
    Any edit from no_verificable (including a consent-only change) moves the
    embarkation back to 'declarado' and writes the transition to
    embarkation_verification_events, so the history reads: tried, couldn't
    verify, seafarer corrected, retried.

    Refuses while 'en_verificacion' or 'verificado' — the declared claim is
    either actively being checked against, or already stands behind a
    'verificado' Castor made to a naviera; declared_* truly never moves
    under either. 'observado' also refuses: that path goes through
    appeal_remark()/resolve_remark(), not a plain field edit."""
    embarkation = get_embarkation(db, embarkation_id)
    if embarkation is None or embarkation.seafarer_id != seafarer_id:
        raise EmbarkationError("embarkation not found")
    if embarkation.verification_status not in ("declarado", "no_verificable"):
        raise EmbarkationError(
            "cannot edit an embarkation while its verification is in progress or concluded"
        )

    for field, value in fields.items():
        if field not in _DECLARED_VERIFIED_FIELDS:
            raise EmbarkationError(f"unknown embarkation field: {field}")
        setattr(embarkation, f"declared_{field}", value)

    if contact_consent is not None:
        embarkation.contact_consent = contact_consent
        if contact_consent:
            embarkation.contact_consent_at = now()

    if embarkation.verification_status == "no_verificable":
        _apply_transition(
            db, embarkation, "declarado",
            reason="El marino corrigió el dato declarado tras un no_verificable",
            actor_user_id=seafarer_id,
        )
    db.commit()
    db.refresh(embarkation)
    return embarkation


def can_record_contact_attempt(db: Session, embarkation_id: str) -> None:
    """Same checks as record_contact_attempt(), without writing anything.
    Call this BEFORE uploading an attachment to GCS (2026-09-15, Rick nota
    68) — uploading first and only then finding out the attempt is rejected
    (the cap is a designed path, not an edge case: it has its own test)
    leaves an orphaned blob nobody ever references."""
    embarkation = get_embarkation(db, embarkation_id)
    if embarkation is None:
        raise EmbarkationError("embarkation not found")
    current_count = (
        db.query(EmbarkationContactLog)
        .filter(EmbarkationContactLog.embarkation_id == embarkation_id)
        .count()
    )
    if current_count >= _MAX_ATTEMPTS:
        raise AttemptCapReached(f"embarkation already has {_MAX_ATTEMPTS} contact attempts logged")


def record_contact_attempt(
    db: Session,
    embarkation_id: str,
    *,
    actor_user_id: str,
    channel: str,
    contacted_at: Optional[datetime] = None,
    phone_number_called: Optional[str] = None,
    respondent_name: Optional[str] = None,
    respondent_position: Optional[str] = None,
    email_contacted: Optional[str] = None,
    attachment_ref: Optional[str] = None,
    comments: Optional[str] = None,
) -> EmbarkationContactLog:
    """Task 1.b: verification_attempts is DERIVED from COUNT(*) of this
    table, never written by hand, and capped at 10 — the 11th attempt is
    rejected outright, not silently truncated.

    Callers that accept an attachment (embarkations.py's
    admin_record_contact_attempt) MUST call can_record_contact_attempt()
    first and only upload to GCS if it doesn't raise — this function
    re-checks the same conditions (never trust a check made by a caller
    across an I/O boundary), but by the time control reaches here the
    upload has already happened and can't be un-done from this side."""
    if channel not in ("telefono", "email"):
        raise EmbarkationError("channel must be 'telefono' or 'email'")
    can_record_contact_attempt(db, embarkation_id)
    embarkation = get_embarkation(db, embarkation_id)

    current_count = (
        db.query(EmbarkationContactLog)
        .filter(EmbarkationContactLog.embarkation_id == embarkation_id)
        .count()
    )
    row = EmbarkationContactLog(
        embarkation_id=embarkation_id,
        attempt_no=current_count + 1,
        contacted_at=contacted_at or now(),
        channel=channel,
        phone_number_called=phone_number_called,
        respondent_name=respondent_name,
        respondent_position=respondent_position,
        email_contacted=email_contacted,
        attachment_ref=attachment_ref,
        comments=comments,
        actor_user_id=actor_user_id,
    )
    db.add(row)
    # Task 1.b — derived, not incremented independently: recompute from the
    # row we just added rather than trusting a += 1 to stay in sync forever.
    embarkation.verification_attempts = current_count + 1
    db.commit()
    db.refresh(row)
    return row


def conclude_verified(
    db: Session,
    embarkation_id: str,
    *,
    actor_user_id: str,
    verified_fields: dict,
) -> Embarkation:
    """en_verificacion -> verificado. verified_fields keys are the bare
    field names (e.g. "vessel_name"), not "verified_vessel_name"."""
    embarkation = get_embarkation(db, embarkation_id)
    if embarkation is None:
        raise EmbarkationError("embarkation not found")

    for field, value in verified_fields.items():
        if field not in _DECLARED_VERIFIED_FIELDS:
            raise EmbarkationError(f"unknown embarkation field: {field}")
        setattr(embarkation, f"verified_{field}", value)

    embarkation.has_correction = _differs_from_declared(embarkation)
    embarkation.verified_by = actor_user_id
    embarkation.verified_at = now()
    _apply_transition(db, embarkation, "verificado", reason=None, actor_user_id=actor_user_id)

    ctx = {
        "seafarer_name": seafarer_display_name(db, embarkation.seafarer_id),
        "vessel_name": _vessel_name(embarkation),
        "company_name": _company_name(embarkation),
    }
    _notify(
        db, kind="embarkation_verified", subject_type="embarkation", subject_id=embarkation.id,
        context=ctx, seafarer_id=embarkation.seafarer_id, admin=True,
        company_ids=_active_company_ids(db, embarkation.seafarer_id),
    )
    db.commit()
    db.refresh(embarkation)
    return embarkation


def conclude_no_verificable(
    db: Session,
    embarkation_id: str,
    *,
    actor_user_id: str,
    reason: str,
) -> Embarkation:
    """en_verificacion -> no_verificable. Task 1.a: BOTH conditions —
    the 30-day deadline must have passed AND at least 5 attempts must be
    logged. Neither alone is enough; this is about the naviera's silence,
    not the admin's own diligence."""
    embarkation = get_embarkation(db, embarkation_id)
    if embarkation is None:
        raise EmbarkationError("embarkation not found")

    deadline_reached = (
        embarkation.verification_deadline_at is not None
        and now() >= embarkation.verification_deadline_at
    )
    enough_attempts = embarkation.verification_attempts >= _MIN_ATTEMPTS_FOR_NO_VERIFICABLE
    if not (deadline_reached and enough_attempts):
        raise NotYetEligible(
            "no_verificable requires BOTH verification_deadline_at reached AND "
            f"verification_attempts >= {_MIN_ATTEMPTS_FOR_NO_VERIFICABLE} "
            f"(deadline_reached={deadline_reached}, attempts={embarkation.verification_attempts})"
        )

    _apply_transition(db, embarkation, "no_verificable", reason=reason, actor_user_id=actor_user_id)

    ctx = {
        "seafarer_name": seafarer_display_name(db, embarkation.seafarer_id),
        "vessel_name": _vessel_name(embarkation),
        "company_name": _company_name(embarkation),
        "reason": reason,
    }
    _notify(
        db, kind="embarkation_no_verificable", subject_type="embarkation", subject_id=embarkation.id,
        context=ctx, seafarer_id=embarkation.seafarer_id, admin=True,
        company_ids=_active_company_ids(db, embarkation.seafarer_id),
    )
    db.commit()
    db.refresh(embarkation)
    return embarkation


def conclude_observado(
    db: Session,
    embarkation_id: str,
    *,
    actor_user_id: str,
    field: str,
    finding: str,
) -> tuple[Embarkation, EmbarkationRemark]:
    """en_verificacion -> observado. Creates the embarkation_remark that
    carries the actual finding (§4) — the embarkation row itself never
    stores the finding text, only the badge-worthy status."""
    embarkation = get_embarkation(db, embarkation_id)
    if embarkation is None:
        raise EmbarkationError("embarkation not found")

    remark = EmbarkationRemark(
        subject_type="embarkation", subject_id=embarkation_id,
        field=field, finding=finding, created_by=actor_user_id,
    )
    db.add(remark)
    _apply_transition(
        db, embarkation, "observado",
        reason=f"Información encontrada falsa: {field}", actor_user_id=actor_user_id,
    )

    ctx = {
        "seafarer_name": seafarer_display_name(db, embarkation.seafarer_id),
        "vessel_name": _vessel_name(embarkation),
        "company_name": _company_name(embarkation),
        "field": field,
        "finding": finding,
    }
    _notify(
        db, kind="embarkation_observado", subject_type="embarkation", subject_id=embarkation.id,
        context=ctx, seafarer_id=embarkation.seafarer_id, admin=True,
        company_ids=_active_company_ids(db, embarkation.seafarer_id),
    )
    db.commit()
    db.refresh(embarkation)
    db.refresh(remark)
    return embarkation, remark


def revert_verified(
    db: Session,
    embarkation_id: str,
    *,
    actor_user_id: str,
    cause: str,
    reason: str,
    field: Optional[str] = None,
    finding: Optional[str] = None,
) -> tuple[Embarkation, Optional[EmbarkationRemark]]:
    """verificado -> no_verificable | observado. §1 decision 4: reversion
    never deletes anything — the append-only event log keeps the period it
    was verified, with what evidence, and why it was reverted. No deadline/
    attempts precondition here (unlike conclude_no_verificable) — this is an
    admin's deliberate reversal, not the 30-day silence rule."""
    if cause not in ("no_verificable", "observado"):
        raise EmbarkationError("cause must be 'no_verificable' or 'observado'")
    embarkation = get_embarkation(db, embarkation_id)
    if embarkation is None:
        raise EmbarkationError("embarkation not found")

    embarkation.reverted_by = actor_user_id
    embarkation.reverted_at = now()

    remark: Optional[EmbarkationRemark] = None
    if cause == "observado":
        if not field or not finding:
            raise EmbarkationError("cause='observado' requires field and finding")
        remark = EmbarkationRemark(
            subject_type="embarkation", subject_id=embarkation_id,
            field=field, finding=finding, created_by=actor_user_id,
        )
        db.add(remark)

    _apply_transition(db, embarkation, cause, reason=reason, actor_user_id=actor_user_id)

    ctx = {
        "seafarer_name": seafarer_display_name(db, embarkation.seafarer_id),
        "vessel_name": _vessel_name(embarkation),
        "company_name": _company_name(embarkation),
        "reason": reason,
    }
    _notify(
        db, kind="embarkation_verified_reverted", subject_type="embarkation", subject_id=embarkation.id,
        context=ctx, seafarer_id=embarkation.seafarer_id, admin=True,
        company_ids=_active_company_ids(db, embarkation.seafarer_id),
    )
    db.commit()
    db.refresh(embarkation)
    if remark is not None:
        db.refresh(remark)
    return embarkation, remark


def get_remark(db: Session, remark_id: str) -> Optional[EmbarkationRemark]:
    return db.query(EmbarkationRemark).filter(EmbarkationRemark.id == remark_id).first()


def _remark_embarkation_context(db: Session, remark: EmbarkationRemark) -> tuple[Optional[Embarkation], dict]:
    """Only subject_type='embarkation' remarks exist in E-1 (§4 says the
    mechanism is general — document/CV remarks are a later hito's problem).
    Raises if this ever sees another subject_type, instead of silently
    building an empty/wrong notification context."""
    if remark.subject_type != "embarkation":
        raise EmbarkationError(
            f"remark subject_type={remark.subject_type!r} has no notification "
            "context wired yet — only 'embarkation' is implemented in E-1"
        )
    embarkation = get_embarkation(db, remark.subject_id)
    if embarkation is None:
        raise EmbarkationError("remark's embarkation not found")
    ctx = {
        "seafarer_name": seafarer_display_name(db, embarkation.seafarer_id),
        "vessel_name": _vessel_name(embarkation),
        "company_name": _company_name(embarkation),
        "field": remark.field,
    }
    return embarkation, ctx


def appeal_remark(db: Session, remark_id: str, *, seafarer_id: str, appeal_text: str) -> EmbarkationRemark:
    """The marino appeals a remark (§4) — keeps the case open, read by the
    admin. Self-scoped: the caller must own the embarkation this remark is
    about, checked by the router the same "self" way as everything else
    (L-1/L-2) — this function trusts the seafarer_id it's given."""
    remark = get_remark(db, remark_id)
    if remark is None:
        raise EmbarkationError("remark not found")
    if remark.resolution is not None:
        raise EmbarkationError("this remark is already resolved — cannot appeal")
    if remark.appeal_text is not None:
        raise EmbarkationError("this remark was already appealed")
    if not appeal_text.strip():
        raise EmbarkationError("appeal_text cannot be empty")

    embarkation, ctx = _remark_embarkation_context(db, remark)
    if embarkation.seafarer_id != seafarer_id:
        raise EmbarkationError("this remark does not belong to this seafarer")

    remark.appeal_text = appeal_text
    remark.appealed_at = now()
    ctx["appeal_text"] = appeal_text
    _notify(
        db, kind="embarkation_remark_appealed", subject_type="remark", subject_id=remark.id,
        context=ctx, admin=True,
    )
    db.commit()
    db.refresh(remark)
    return remark


def resolve_remark(
    db: Session, remark_id: str, *, actor_user_id: str, resolution: str,
) -> EmbarkationRemark:
    """Admin resolves an appealed remark — 'subsanado' (the seafarer's
    explanation stood up) or 'sostenido' (the finding stands despite the
    appeal). Requires an appeal to exist; the no-appeal case is
    mark_remark_firm(), a different outcome with a different notification."""
    if resolution not in ("subsanado", "sostenido"):
        raise EmbarkationError("resolution must be 'subsanado' or 'sostenido'")
    remark = get_remark(db, remark_id)
    if remark is None:
        raise EmbarkationError("remark not found")
    if remark.appeal_text is None:
        raise EmbarkationError("this remark was never appealed — use mark_remark_firm instead")
    if remark.resolution is not None:
        raise EmbarkationError("this remark is already resolved")

    embarkation, ctx = _remark_embarkation_context(db, remark)
    remark.resolution = resolution
    remark.resolved_by = actor_user_id
    remark.resolved_at = now()
    ctx["resolution"] = resolution
    _notify(
        db, kind="embarkation_remark_resolved", subject_type="remark", subject_id=remark.id,
        context=ctx, seafarer_id=embarkation.seafarer_id, admin=True,
        company_ids=_active_company_ids(db, embarkation.seafarer_id),
    )
    db.commit()
    db.refresh(remark)
    return remark


def mark_remark_firm(db: Session, remark_id: str, *, actor_user_id: str) -> EmbarkationRemark:
    """§4: 'si el marino no apela, ... la decisión queda firme con la
    remarca. No hay plazo que la endurezca ni resolución de oficio' — there
    is no automatic timer, so an admin closes this explicitly when they
    judge the window for an appeal has passed. Refuses if an appeal exists:
    that case goes through resolve_remark() instead."""
    remark = get_remark(db, remark_id)
    if remark is None:
        raise EmbarkationError("remark not found")
    if remark.appeal_text is not None:
        raise EmbarkationError("this remark was appealed — use resolve_remark instead")
    if remark.resolution is not None:
        raise EmbarkationError("this remark is already resolved")

    embarkation, ctx = _remark_embarkation_context(db, remark)
    remark.resolution = "firme_sin_apelacion"
    remark.resolved_by = actor_user_id
    remark.resolved_at = now()
    _notify(
        db, kind="embarkation_remark_firm", subject_type="remark", subject_id=remark.id,
        context=ctx, seafarer_id=embarkation.seafarer_id, admin=True,
        company_ids=_active_company_ids(db, embarkation.seafarer_id),
    )
    db.commit()
    db.refresh(remark)
    return remark


def reopen(db: Session, embarkation_id: str, *, actor_user_id: str) -> Embarkation:
    """no_verificable -> en_verificacion. Task 1.c: verification_attempts is
    NOT reset here — it keeps accumulating against the cap of 10. A fresh
    30-day clock starts (a new cycle, triggered by new evidence), but the
    attempt count carries over on purpose."""
    embarkation = get_embarkation(db, embarkation_id)
    if embarkation is None:
        raise EmbarkationError("embarkation not found")

    reopened_at = now()
    embarkation.verification_opened_at = reopened_at
    embarkation.verification_deadline_at = reopened_at + _VERIFICATION_WINDOW
    _apply_transition(db, embarkation, "en_verificacion", reason=None, actor_user_id=actor_user_id)
    db.commit()
    db.refresh(embarkation)
    return embarkation
