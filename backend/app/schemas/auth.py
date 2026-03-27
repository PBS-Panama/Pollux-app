from pydantic import BaseModel, EmailStr
from datetime import datetime, date
from typing import Optional


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
    # Company fields
    company_name: Optional[str] = None


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

    class Config:
        from_attributes = True
