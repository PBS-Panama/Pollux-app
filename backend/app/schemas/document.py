from pydantic import BaseModel
from datetime import date, datetime
from typing import Any, Optional


class DocumentCreate(BaseModel):
    name: str
    cert_code: Optional[str] = None
    doc_key: Optional[str] = None
    issuing_country: Optional[str] = None
    file_name: Optional[str] = None
    saved_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    category: Optional[int] = None
    category_label: Optional[str] = None
    validity_years: Optional[int] = None
    issued_date: Optional[date] = None
    expiry_date: Optional[date] = None


class DocumentResponse(BaseModel):
    id: str
    seafarer_id: str
    name: str
    cert_code: Optional[str] = None
    doc_key: Optional[str] = None
    issuing_country: Optional[str] = None
    file_name: Optional[str] = None
    saved_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    category: Optional[int] = None
    category_label: Optional[str] = None
    validity_years: Optional[int] = None
    issued_date: Optional[date] = None
    expiry_date: Optional[date] = None
    verification_status: str = "pending"
    rejection_reason: Optional[str] = None
    verified_at: Optional[datetime] = None
    status: str
    uploaded_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
