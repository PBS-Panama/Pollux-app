from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class DocumentCreate(BaseModel):
    name: str
    cert_code: Optional[str] = None
    issued_date: Optional[date] = None
    expiry_date: Optional[date] = None


class DocumentResponse(BaseModel):
    id: str
    seafarer_id: str
    name: str
    cert_code: Optional[str] = None
    file_path: Optional[str] = None
    issued_date: Optional[date] = None
    expiry_date: Optional[date] = None
    status: str
    uploaded_at: datetime

    class Config:
        from_attributes = True
