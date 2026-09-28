import uuid
from datetime import datetime, timezone, date
from sqlalchemy import String, DateTime, Date, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from typing import Any, Optional
from app.db.base import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    seafarer_id: Mapped[str] = mapped_column(String, ForeignKey("seafarers.id"), nullable=False, index=True)

    # Document identity
    name: Mapped[str] = mapped_column(String(200), nullable=False)       # e.g. "Basic Safety Training Certificate"
    cert_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)   # STCW rule, e.g. "VI/1"
    # Full document-type display name, matched exactly against doc_type_rules.doc_key
    # (also VARCHAR(300)) for OCR keyword rules — e.g. "Flag State Medical Certificate",
    # or "IMO 1.23 — Proficiency in..." for the longer IMO course titles.
    doc_key: Mapped[Optional[str]] = mapped_column(String(300), nullable=True, index=True)
    issuing_country: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)       # ISO-3166 alpha-2, e.g. "PA"

    # File storage (Express crewing layer)
    file_name: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)   # original upload filename
    saved_name: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # stored as {docId}{ext}
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)   # legacy S3 key (unused)

    # Standardised download name (Obj.2) -- [Rank]_[RegCode]_[Country]_[UserCode]_exp[YYYYMMDD]
    # Created in DB via ALTER in main.py; declared here so the ORM matches the schema.
    code_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    # Catalog metadata
    category: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    category_label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    validity_years: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Dates
    issued_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Verification workflow  (pending -> under_review -> verified / rejected)
    verification_status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending")
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verified_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # AI/OCR verdict (Obj.3 -- placeholder column)
    ai_verdict: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    registry_result: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)

    # Record status and timestamps
    status: Mapped[str] = mapped_column(String(50), default="pending")
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
