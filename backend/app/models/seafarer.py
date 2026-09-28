import uuid
from datetime import datetime, timezone, date
from typing import Optional
from sqlalchemy import String, DateTime, Date, ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Seafarer(Base):
    __tablename__ = "seafarers"

    id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    nationality: Mapped[str | None] = mapped_column(String(100), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    rank: Mapped[str | None] = mapped_column(String(100), nullable=True)
    years_experience: Mapped[int] = mapped_column(default=0)
    bio: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_available: Mapped[bool] = mapped_column(default=True)
    # Visibility opt-out (Rick, 2026-09-13): visible in company Discover by
    # default; the seafarer can hide via their own profile toggle (Castor).
    discoverable: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # ── AMP Panamá profile fields (Regulation.md §14–§23) ─────────────────
    # coc_type: "amp" | "foreign_endorsed" | "none"
    coc_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # e.g. "Philippines", "Greece", "Panama"
    coc_issuing_country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # e.g. "< 500 GT", "500–3000 GT", "> 3000 GT", "Unlimited"
    coc_tonnage_limit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # "none" | "chemical" | "oil" | "gas"
    cop_tanker_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # "basic" | "advanced"
    cop_tanker_level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # ["Panama", "Liberia", "Marshall Islands", ...]
    flag_endorsements: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # ["Offshore MOU", "Yacht", "Fishing", "National waters", ...]
    special_endorsements: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # ── Fleet category — determines rank catalog & compliance rules ────────
    # "merchant" | "offshore" | "fishing" | "yacht" | "national"
    fleet_category: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ── Extended profile (added via migrations, sync'd here) ──────────────
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    department: Mapped[str | None] = mapped_column(String(50), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    nationalities: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    spoken_languages: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    vessel_types: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # ── Residence ─────────────────────────────────────────────────────────
    residence_country: Mapped[str | None] = mapped_column(String(10), nullable=True)
    residence_province: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reference_airport: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # ── Emergency contact (Phase 2) ───────────────────────────────────────
    emergency_contact_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    emergency_contact_relation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)


class SeafarerLearningProgress(Base):
    __tablename__ = "seafarer_learning_progress"
    # FK constraints enforced at DB level via CREATE TABLE in main.py (learning_series
    # is not an ORM model, so we use plain String columns here).
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    seafarer_id: Mapped[str] = mapped_column(String, ForeignKey("seafarers.id", ondelete="CASCADE"), nullable=False, index=True)
    series_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="enrolled")
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_watched_episode_id: Mapped[str | None] = mapped_column(String, nullable=True)
    progress_pct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
