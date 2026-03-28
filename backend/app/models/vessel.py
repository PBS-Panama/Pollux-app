import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Vessel(Base):
    __tablename__ = "vessels"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String, ForeignKey("companies.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    imo_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    vessel_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    flag_state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    gross_tonnage: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
