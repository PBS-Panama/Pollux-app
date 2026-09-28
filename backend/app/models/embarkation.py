import uuid
from datetime import datetime, timezone, date
from typing import Optional
from sqlalchemy import String, DateTime, Date, ForeignKey, Integer, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Embarkation(Base):
    """A seafarer's claimed shipment and Castor's own verification of it
    (docs/specs/EMBARQUES_MODELO_VERIFICACION.md). declared_* is the
    seafarer's own claim and is NEVER overwritten; verified_* stays NULL
    until an admin closes a verification with accepted evidence. Never write
    verification_status directly — see app/services/embarkation_service.py,
    the only module allowed to change it."""
    __tablename__ = "embarkations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    seafarer_id: Mapped[str] = mapped_column(String, ForeignKey("seafarers.id", ondelete="CASCADE"), nullable=False, index=True)

    declared_vessel_name: Mapped[str] = mapped_column(String(200), nullable=False)
    declared_vessel_imo: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    declared_company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    declared_rank: Mapped[str] = mapped_column(String(100), nullable=False)
    declared_date_from: Mapped[date] = mapped_column(Date, nullable=False)
    declared_date_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    verified_vessel_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    verified_vessel_imo: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    verified_company_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    verified_rank: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    verified_date_from: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    verified_date_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # State machine (§2 of the spec) — declarado | en_verificacion | verificado
    # | no_verificable | observado. Only embarkation_service.py may change this.
    verification_status: Mapped[str] = mapped_column(String(20), nullable=False, default="declarado")
    status_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # True once any verified_* differs from its declared_* counterpart (§1
    # decision 3 — partial contradiction is kept side by side, not chosen between).
    has_correction: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    verification_opened_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    verification_deadline_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    # Derived from embarkation_contact_log (COUNT of its rows) — never
    # incremented directly. See embarkation_service.record_contact_attempt.
    verification_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    verified_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reverted_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    reverted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Per-embarkation consent to being contacted — decided 2026-09-14 (that
    # day's Handover, nota 29), carried forward per the new spec's §6 note
    # ("el consentimiento por embarque ya estaba decidido: va en columnas").
    contact_consent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    contact_consent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class EmbarkationContactLog(Base):
    """One row per admin contact attempt with the shipping company (§3). The
    set of rows for an embarkation IS the evidence — there is no separate
    evidence-type column. embarkations.verification_attempts is derived from
    COUNT(*) here; never write that column directly."""
    __tablename__ = "embarkation_contact_log"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    embarkation_id: Mapped[str] = mapped_column(String, ForeignKey("embarkations.id", ondelete="CASCADE"), nullable=False, index=True)
    attempt_no: Mapped[int] = mapped_column(Integer, nullable=False)  # 1..10, sequential
    contacted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    channel: Mapped[str] = mapped_column(String(20), nullable=False)  # telefono | email
    phone_number_called: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    respondent_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    respondent_position: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    email_contacted: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)
    # GCS blob path from app.services.embarkation_storage.store_attachment() —
    # never a container filesystem path.
    attachment_ref: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    actor_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class EmbarkationVerificationEvent(Base):
    """Append-only audit trail (§6) — never updated or deleted. The only way
    to answer "what did Castor claim, since when, until when" (§1 decision 4)."""
    __tablename__ = "embarkation_verification_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    embarkation_id: Mapped[str] = mapped_column(String, ForeignKey("embarkations.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    to_status: Mapped[str] = mapped_column(String(20), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    actor_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class EmbarkationRemark(Base):
    """A "remarca a subsanar" (§4) — general across subject types (embarkation
    today; document/CV data later, per the spec). Not a terminal rejection:
    appealing keeps the case open; not appealing IS the conformity (no
    deadline, no default resolution)."""
    __tablename__ = "embarkation_remarks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_type: Mapped[str] = mapped_column(String(20), nullable=False)  # embarkation | document
    subject_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    field: Mapped[str] = mapped_column(String(100), nullable=False)
    finding: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    appeal_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    appealed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    # subsanado | sostenido | firme_sin_apelacion — NULL while open.
    resolution: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
