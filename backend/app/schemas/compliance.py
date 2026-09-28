from pydantic import BaseModel
from datetime import date
from typing import Any, Optional, List


class DocComplianceItemResponse(BaseModel):
    name: str
    cert: str
    level: str
    cert_type: str
    validity_years: Optional[int]
    state: str
    issued_date: Optional[date]
    expiry_date: Optional[date]
    days_remaining: Optional[int]
    has_file: bool
    verification_status: Optional[str] = None
    ai_verdict: Optional[Any] = None


class ComplianceReportResponse(BaseModel):
    rank: str
    total_required: int
    valid_count: int
    expiring_count: int
    critical_count: int
    expired_count: int
    missing_count: int
    compliance_score: float
    can_be_listed: bool
    is_fully_compliant: bool
    rank_recognized: bool
    to_docs_count: int
    docs: List[DocComplianceItemResponse]


class CatalogDocResponse(BaseModel):
    name: str
    cert: str
    level: str
    cert_type: str
    validity_years: Optional[int]
