from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.models.seafarer import Seafarer
from app.models.company import Company
from app.models.vessel import Vessel
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from pydantic import BaseModel


class RefreshRequest(BaseModel):
    refresh_token: str

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    # Validate role
    if payload.role not in ("seafarer", "company"):
        raise HTTPException(status_code=400, detail="role must be 'seafarer' or 'company'")

    # Check duplicate email
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create base user
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.flush()  # get user.id before committing

    if payload.role == "seafarer":
        seafarer = Seafarer(
            id=user.id,
            first_name=payload.first_name or "",
            last_name=payload.last_name or "",
            nationality=payload.nationality,
            city=payload.city,
            phone=payload.phone,
            rank=payload.rank,
            date_of_birth=payload.date_of_birth,
            years_experience=payload.years_experience or 0,
            bio=payload.bio,
        )
        db.add(seafarer)

    elif payload.role == "company":
        company = Company(
            name=payload.company_name or "Unnamed Company",
            ruc=payload.ruc,
            country=payload.country,
            city=payload.city,
            address=payload.address,
            website=payload.website,
            sector=payload.sector,
            company_size=payload.company_size,
            contact_email=payload.email,
            fleet_size=len(payload.vessels) if payload.vessels else 0,
            legal_rep_name=payload.legal_rep_name,
            legal_rep_phone=payload.legal_rep_phone,
            legal_rep_email=payload.legal_rep_email,
            hr_rep_name=payload.hr_rep_name,
            hr_rep_phone=payload.hr_rep_phone,
            hr_rep_email=payload.hr_rep_email,
        )
        db.add(company)
        db.flush()
        user.company_id = company.id

        # Register vessels if provided
        if payload.vessels:
            for v in payload.vessels:
                vessel = Vessel(
                    company_id=company.id,
                    name=v.name,
                    imo_number=v.imo_number,
                    vessel_type=v.vessel_type,
                    flag_state=v.flag_state,
                    gross_tonnage=v.gross_tonnage,
                )
                db.add(vessel)

    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token_data = {"sub": user.id, "role": user.role, "company_id": user.company_id}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    token_data = {"sub": data.get("sub"), "role": data.get("role"), "company_id": data.get("company_id")}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    seafarer = db.query(Seafarer).filter(Seafarer.id == current_user.id).first()
    company = db.query(Company).filter(Company.id == current_user.company_id).first() if current_user.company_id else None
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        company_id=current_user.company_id,
        created_at=current_user.created_at,
        rank=seafarer.rank if seafarer else None,
        first_name=seafarer.first_name if seafarer else None,
        last_name=seafarer.last_name if seafarer else None,
        date_of_birth=seafarer.date_of_birth if seafarer else None,
        nationality=seafarer.nationality if seafarer else None,
        phone=seafarer.phone if seafarer else None,
        city=seafarer.city if seafarer else None,
        years_experience=seafarer.years_experience if seafarer else None,
        bio=seafarer.bio if seafarer else None,
        languages=seafarer.languages if seafarer else None,
        vessels_worked=seafarer.vessels_worked if seafarer else None,
        companies_worked=seafarer.companies_worked if seafarer else None,
        is_available=seafarer.is_available if seafarer else None,
        company_name=company.name if company else None,
    )
