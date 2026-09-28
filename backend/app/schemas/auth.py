from pydantic import BaseModel, EmailStr
from datetime import datetime, date
from typing import Optional, List


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: str  # "seafarer" or "company"
    # Seafarer fields
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    nationality: Optional[str] = None
    phone: Optional[str] = None
    rank: Optional[str] = None
    fleet_category: Optional[str] = None  # "merchant"|"offshore"|"fishing"|"yacht"|"national"
    date_of_birth: Optional[date] = None
    # Company fields
    company_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    # Required (and checked) only for role="company" accounts — see routers/auth.py.
    # Ignored for seafarer/admin logins, which have no company to match against.
    company_name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    company_id: Optional[str] = None
    seafarer_code: Optional[str] = None
    created_at: datetime
    # Company approval (2026-09-14) — lets the frontend show "pending
    # approval"/"rejected" instead of a bare 403 from every /company/* call.
    email_verified: bool = False
    company_status: Optional[str] = None
    company_rejection_reason: Optional[str] = None
    # Basic seafarer profile
    rank: Optional[str] = None
    fleet_category: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    avatar: Optional[str] = None
    # Maritime compliance fields
    coc_type: Optional[str] = None
    coc_issuing_country: Optional[str] = None
    coc_tonnage_limit: Optional[str] = None
    cop_tanker_type: Optional[str] = None
    cop_tanker_level: Optional[str] = None
    flag_endorsements: Optional[List[str]] = None
    special_endorsements: Optional[List[str]] = None

    class Config:
        from_attributes = True
