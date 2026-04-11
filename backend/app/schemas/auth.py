from pydantic import BaseModel, EmailStr
from datetime import datetime, date
from typing import Optional, List


class VesselInput(BaseModel):
    name: str
    imo_number: Optional[str] = None
    vessel_type: Optional[str] = None
    flag_state: Optional[str] = None
    gross_tonnage: Optional[int] = None


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
    date_of_birth: Optional[date] = None
    years_experience: Optional[int] = None
    bio: Optional[str] = None
    # Company fields
    company_name: Optional[str] = None
    ruc: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    sector: Optional[str] = None
    company_size: Optional[str] = None
    # Representatives
    legal_rep_name: Optional[str] = None
    legal_rep_phone: Optional[str] = None
    legal_rep_email: Optional[str] = None
    hr_rep_name: Optional[str] = None
    hr_rep_phone: Optional[str] = None
    hr_rep_email: Optional[str] = None
    # Fleet
    vessels: Optional[List[VesselInput]] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    company_id: Optional[str] = None
    created_at: datetime
    rank: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    nationality: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    years_experience: Optional[int] = None
    bio: Optional[str] = None
    languages: Optional[str] = None
    vessels_worked: Optional[str] = None
    companies_worked: Optional[str] = None
    is_available: Optional[bool] = None
    company_name: Optional[str] = None

    class Config:
        from_attributes = True


class SeafarerUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    nationality: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    rank: Optional[str] = None
    years_experience: Optional[int] = None
    bio: Optional[str] = None
    languages: Optional[str] = None
    vessels_worked: Optional[str] = None
    companies_worked: Optional[str] = None
    is_available: Optional[bool] = None
    date_of_birth: Optional[date] = None
