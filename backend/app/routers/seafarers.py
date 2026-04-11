from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.models.seafarer import Seafarer
from app.schemas.auth import SeafarerUpdateRequest, UserResponse

router = APIRouter()


@router.patch("/seafarers/me", response_model=UserResponse)
def update_my_seafarer_profile(
    payload: SeafarerUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.seafarer:
        raise HTTPException(status_code=403, detail="Only seafarer accounts can update this profile")

    seafarer = db.query(Seafarer).filter(Seafarer.id == current_user.id).first()
    if not seafarer:
        raise HTTPException(status_code=404, detail="Seafarer profile not found")

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(seafarer, field, value)

    db.commit()
    db.refresh(seafarer)

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        company_id=current_user.company_id,
        created_at=current_user.created_at,
        rank=seafarer.rank,
        first_name=seafarer.first_name,
        last_name=seafarer.last_name,
        date_of_birth=seafarer.date_of_birth,
        nationality=seafarer.nationality,
        phone=seafarer.phone,
        city=seafarer.city,
        years_experience=seafarer.years_experience,
        bio=seafarer.bio,
        languages=seafarer.languages,
        vessels_worked=seafarer.vessels_worked,
        companies_worked=seafarer.companies_worked,
        is_available=seafarer.is_available,
        company_name=None,
    )
