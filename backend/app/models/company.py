import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    contact_email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fleet_size: Mapped[int] = mapped_column(default=0)
    is_verified: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    # Approval state machine (Rick, 2026-09-14): pending -> approved | rejected.
    # Separate from `is_verified` (pre-existing, unused elsewhere today) and
    # from users.email_verified — the endpoint gate requires both.
    company_status: Mapped[str] = mapped_column(String(20), default="pending")
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
