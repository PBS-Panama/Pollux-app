import uuid
from datetime import datetime, timezone, date
from sqlalchemy import String, DateTime, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Seafarer(Base):
    __tablename__ = "seafarers"

    id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    nationality: Mapped[str | None] = mapped_column(String(100), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    rank: Mapped[str | None] = mapped_column(String(100), nullable=True)
    years_experience: Mapped[int] = mapped_column(default=0)
    bio: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    languages: Mapped[str | None] = mapped_column(String(500), nullable=True)
    vessels_worked: Mapped[str | None] = mapped_column(String(500), nullable=True)
    companies_worked: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_available: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
