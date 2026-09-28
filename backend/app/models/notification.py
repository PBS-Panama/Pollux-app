import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Notification(Base):
    """The campanita for all three audiences — marino, admin, and Pollux
    company users (docs/specs/EMBARQUES_MODELO_VERIFICACION.md §5). One
    shared table, not three separate inboxes: `users` is shared between both
    products and this is the same backend, so `recipient_scope` is what each
    frontend filters on to render its own bell.

    NOT admin_alerts (admin.py's existing ops log, GET /admin/alerts) — that
    is a different thing and is not reused here.

    General from day 1 (kind/subject_type/recipient_scope), but E-1 only ever
    creates rows for the embarkation/remark events in the spec's §5 matrix —
    wiring every other trámite (OCR, company approval, email verification) is
    explicitly out of scope for this hito (§7).
    """
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_scope: Mapped[str] = mapped_column(String(20), nullable=False)  # seafarer | admin | company
    company_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    kind: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    subject_type: Mapped[str] = mapped_column(String(20), nullable=False)  # embarkation | document | remark
    subject_id: Mapped[str] = mapped_column(String(36), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    requires_ack: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    acknowledged_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
