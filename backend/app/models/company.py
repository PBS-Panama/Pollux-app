import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    ruc: Mapped[str | None] = mapped_column(String(50), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    website: Mapped[str | None] = mapped_column(String(300), nullable=True)
    sector: Mapped[str | None] = mapped_column(String(100), nullable=True)
    company_size: Mapped[str | None] = mapped_column(String(20), nullable=True)
    contact_email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    fleet_size: Mapped[int] = mapped_column(default=0)
    is_verified: Mapped[bool] = mapped_column(default=False)
    # Representatives
    legal_rep_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    legal_rep_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    legal_rep_email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    hr_rep_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    hr_rep_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    hr_rep_email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
