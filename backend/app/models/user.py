import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
import enum


class UserRole(str, enum.Enum):
    seafarer = "seafarer"
    company = "company"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(SAEnum(UserRole), nullable=False)
    company_id: Mapped[str | None] = mapped_column(String, nullable=True)
    seafarer_code: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    # Company approval (Rick, 2026-09-14) — independent of company_status;
    # the endpoint gate in company.py requires both.
    email_verified: Mapped[bool] = mapped_column(default=False)
    # Password reset (Handover.md nota (58), 2026-09-15) — NULL until the
    # first password change/reset after this column existed. get_current_user
    # (deps.py) rejects any token with iat < this timestamp, so changing the
    # password actually revokes sessions issued before it — JWTs here are
    # stateless (security.py signs only exp, no session store), so without
    # this a password change/reset doesn't invalidate anything already
    # issued. NOT users.updated_at — that changes on any write to the row,
    # including an unrelated admin edit, and would revoke valid sessions for
    # no reason.
    password_changed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
