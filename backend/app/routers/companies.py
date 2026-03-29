from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.company import Company
from app.models.vessel import Vessel

router = APIRouter()


class VesselResponse(BaseModel):
    id: str
    company_id: str
    name: str
    imo_number: str | None = None
    vessel_type: str | None = None
    flag_state: str | None = None
    gross_tonnage: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class VesselCreate(BaseModel):
    name: str
    imo_number: str | None = None
    vessel_type: str | None = None
    flag_state: str | None = None
    gross_tonnage: int | None = None


@router.get("/companies/{company_id}/vessels", response_model=List[VesselResponse])
def get_company_vessels(company_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.company_id != company_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this company's vessels")
    vessels = db.query(Vessel).filter(Vessel.company_id == company_id).order_by(Vessel.created_at).all()
    return vessels


@router.post("/companies/{company_id}/vessels", response_model=VesselResponse, status_code=201)
def add_vessel(company_id: str, payload: VesselCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.company_id != company_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    vessel = Vessel(
        company_id=company_id,
        name=payload.name,
        imo_number=payload.imo_number,
        vessel_type=payload.vessel_type,
        flag_state=payload.flag_state,
        gross_tonnage=payload.gross_tonnage,
    )
    db.add(vessel)
    db.commit()
    db.refresh(vessel)
    return vessel
