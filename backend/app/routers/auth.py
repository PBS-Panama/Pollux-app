from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.models.seafarer import Seafarer
from app.models.company import Company
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse

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
            phone=payload.phone,
            rank=payload.rank,
            date_of_birth=payload.date_of_birth,
        )
        db.add(seafarer)

    elif payload.role == "company":
        company = Company(
            name=payload.company_name or "Unnamed Company",
            contact_email=payload.email,
        )
        db.add(company)
        db.flush()
        user.company_id = company.id

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


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
