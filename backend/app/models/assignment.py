import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, DateTime, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Assignment(Base):
    __tablename__ = 'assignments'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String, ForeignKey('companies.id'), nullable=False)
    vessel_id: Mapped[str] = mapped_column(String, ForeignKey('vessels.id'), nullable=False)
    seafarer_id: Mapped[str] = mapped_column(String, ForeignKey('users.id'), nullable=False)
    role_onboard: Mapped[str | None] = mapped_column(String(100), nullable=True)
    embark_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    disembark_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default='planned')
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
