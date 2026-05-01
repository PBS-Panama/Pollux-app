from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.vessel import Vessel
from app.models.seafarer import Seafarer
from app.models.assignment import Assignment

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


class VesselUpdate(BaseModel):
    name: str | None = None
    imo_number: str | None = None
    vessel_type: str | None = None
    flag_state: str | None = None
    gross_tonnage: int | None = None


class CrewListItemResponse(BaseModel):
    id: str
    email: str
    first_name: str | None = None
    last_name: str | None = None
    full_name: str | None = None
    rank: str | None = None
    nationality: str | None = None
    years_experience: int = 0
    date_of_birth: str | None = None
    bio: str | None = None
    department: str
    created_at: datetime


class AssignmentResponse(BaseModel):
    id: str
    company_id: str
    vessel_id: str
    seafarer_id: str
    seafarer_name: str
    seafarer_email: str
    role_onboard: str | None = None
    embark_date: str | None = None
    disembark_date: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class AssignmentCreate(BaseModel):
    seafarer_id: str
    role_onboard: str | None = None
    embark_date: str | None = None
    disembark_date: str | None = None
    status: str | None = 'planned'


class AssignmentUpdate(BaseModel):
    role_onboard: str | None = None
    embark_date: str | None = None
    disembark_date: str | None = None
    status: str | None = None


def infer_department(rank: Optional[str]) -> str:
    if not rank:
        return 'Safety & Survival'

    r = rank.lower()

    if r.startswith('ii/') or 'deck' in r or 'navigation' in r:
        return 'Deck Department'
    if 'eto' in r or 'etr' in r or 'electro' in r:
        return 'Electro-Technical'
    if r.startswith('iii/') or 'engine' in r or 'oiler' in r or 'motorman' in r:
        return 'Engine Department'
    if r.startswith('iv/') or 'gmdss' in r or 'radio' in r:
        return 'Radio / GMDSS'
    if 'medical' in r:
        return 'Medical'
    if 'catering' in r or 'cook' in r or 'steward' in r or 'hotel' in r:
        return 'Catering / Hotel'

    return 'Safety & Survival'


def parse_optional_date(value: Optional[str]):
    if not value:
        return None
    try:
        from datetime import date
        return date.fromisoformat(value)
    except Exception:
        raise HTTPException(status_code=400, detail=f'Invalid date format: {value}. Use YYYY-MM-DD')


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


@router.patch("/companies/{company_id}/vessels/{vessel_id}", response_model=VesselResponse)
def update_vessel(company_id: str, vessel_id: str, payload: VesselUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.company_id != company_id or current_user.role != UserRole.company:
        raise HTTPException(status_code=403, detail="Not authorized")
    vessel = db.query(Vessel).filter(Vessel.id == vessel_id, Vessel.company_id == company_id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(vessel, field, value)
    db.commit()
    db.refresh(vessel)
    return vessel


@router.delete("/companies/{company_id}/vessels/{vessel_id}", status_code=204)
def delete_vessel(company_id: str, vessel_id: str, force: bool = False, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.company_id != company_id or current_user.role != UserRole.company:
        raise HTTPException(status_code=403, detail="Not authorized")
    vessel = db.query(Vessel).filter(Vessel.id == vessel_id, Vessel.company_id == company_id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")

    # Block-if-active-assignments unless ?force=true
    active = (
        db.query(Assignment)
        .filter(Assignment.vessel_id == vessel_id)
        .filter(Assignment.status.in_(['planned', 'active']))
        .count()
    )
    if active > 0 and not force:
        raise HTTPException(
            status_code=400,
            detail=f'Vessel has {active} active/planned assignment(s). Remove them first or pass force=true.',
        )

    # Delete all remaining assignments manually (no cascade on FK)
    db.query(Assignment).filter(Assignment.vessel_id == vessel_id).delete(synchronize_session=False)
    db.delete(vessel)
    db.commit()
    return None


@router.get('/companies/{company_id}/crew', response_model=List[CrewListItemResponse])
def get_company_crew(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    department: str | None = None,
    rank: str | None = None,
    nationality: str | None = None,
    search: str | None = None,
):
    if current_user.company_id != company_id or current_user.role != UserRole.company:
        raise HTTPException(status_code=403, detail='Not authorized to view crew database')

    rows = (
        db.query(User, Seafarer)
        .join(Seafarer, Seafarer.id == User.id)
        .filter(User.role == UserRole.seafarer)
        .filter(User.is_active == True)
        .order_by(Seafarer.created_at.desc())
        .all()
    )

    items: List[CrewListItemResponse] = []
    dep_filter = department.strip().lower() if isinstance(department, str) and department.strip() else None
    rank_filter = rank.strip().lower() if isinstance(rank, str) and rank.strip() else None
    nat_filter = nationality.strip().lower() if isinstance(nationality, str) and nationality.strip() else None
    search_filter = search.strip().lower() if isinstance(search, str) and search.strip() else None

    for user, seafarer in rows:
        dep = infer_department(seafarer.rank)
        full_name = f"{(seafarer.first_name or '').strip()} {(seafarer.last_name or '').strip()}".strip()
        if not full_name:
            full_name = user.email.split('@')[0]

        if dep_filter and dep.lower() != dep_filter:
            continue
        if rank_filter and (not seafarer.rank or seafarer.rank.lower() != rank_filter):
            continue
        if nat_filter and (not seafarer.nationality or seafarer.nationality.lower() != nat_filter):
            continue
        if search_filter:
            searchable = f"{full_name} {user.email} {seafarer.rank or ''} {seafarer.nationality or ''}".lower()
            if search_filter not in searchable:
                continue

        items.append(
            CrewListItemResponse(
                id=user.id,
                email=user.email,
                first_name=seafarer.first_name,
                last_name=seafarer.last_name,
                full_name=full_name,
                rank=seafarer.rank,
                nationality=seafarer.nationality,
                years_experience=seafarer.years_experience or 0,
                date_of_birth=seafarer.date_of_birth.isoformat() if seafarer.date_of_birth else None,
                bio=seafarer.bio,
                department=dep,
                created_at=seafarer.created_at,
            )
        )

    return items


@router.get('/companies/{company_id}/vessels/{vessel_id}/assignments', response_model=List[AssignmentResponse])
def get_vessel_assignments(
    company_id: str,
    vessel_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id != company_id or current_user.role != UserRole.company:
        raise HTTPException(status_code=403, detail='Not authorized')

    vessel = db.query(Vessel).filter(Vessel.id == vessel_id, Vessel.company_id == company_id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail='Vessel not found')

    rows = (
        db.query(Assignment, User, Seafarer)
        .join(User, User.id == Assignment.seafarer_id)
        .join(Seafarer, Seafarer.id == Assignment.seafarer_id)
        .filter(Assignment.company_id == company_id)
        .filter(Assignment.vessel_id == vessel_id)
        .order_by(Assignment.created_at.desc())
        .all()
    )

    out: List[AssignmentResponse] = []
    for assignment, user, seafarer in rows:
        full_name = f"{(seafarer.first_name or '').strip()} {(seafarer.last_name or '').strip()}".strip() or user.email.split('@')[0]
        out.append(AssignmentResponse(
            id=assignment.id,
            company_id=assignment.company_id,
            vessel_id=assignment.vessel_id,
            seafarer_id=assignment.seafarer_id,
            seafarer_name=full_name,
            seafarer_email=user.email,
            role_onboard=assignment.role_onboard,
            embark_date=assignment.embark_date.isoformat() if assignment.embark_date else None,
            disembark_date=assignment.disembark_date.isoformat() if assignment.disembark_date else None,
            status=assignment.status,
            created_at=assignment.created_at,
            updated_at=assignment.updated_at,
        ))

    return out


@router.post('/companies/{company_id}/vessels/{vessel_id}/assignments', response_model=AssignmentResponse, status_code=201)
def add_vessel_assignment(
    company_id: str,
    vessel_id: str,
    payload: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id != company_id or current_user.role != UserRole.company:
        raise HTTPException(status_code=403, detail='Not authorized')

    vessel = db.query(Vessel).filter(Vessel.id == vessel_id, Vessel.company_id == company_id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail='Vessel not found')

    seafarer_user = db.query(User).filter(User.id == payload.seafarer_id, User.role == UserRole.seafarer, User.is_active == True).first()
    seafarer_profile = db.query(Seafarer).filter(Seafarer.id == payload.seafarer_id).first()
    if not seafarer_user or not seafarer_profile:
        raise HTTPException(status_code=404, detail='Seafarer not found')

    duplicate = (
        db.query(Assignment)
        .filter(Assignment.company_id == company_id)
        .filter(Assignment.vessel_id == vessel_id)
        .filter(Assignment.seafarer_id == payload.seafarer_id)
        .filter(Assignment.status.in_(['planned', 'active']))
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=400, detail='Seafarer already has an active/planned assignment on this vessel')

    assignment = Assignment(
        company_id=company_id,
        vessel_id=vessel_id,
        seafarer_id=payload.seafarer_id,
        role_onboard=payload.role_onboard,
        embark_date=parse_optional_date(payload.embark_date),
        disembark_date=parse_optional_date(payload.disembark_date),
        status=payload.status or 'planned',
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    full_name = f"{(seafarer_profile.first_name or '').strip()} {(seafarer_profile.last_name or '').strip()}".strip() or seafarer_user.email.split('@')[0]
    return AssignmentResponse(
        id=assignment.id,
        company_id=assignment.company_id,
        vessel_id=assignment.vessel_id,
        seafarer_id=assignment.seafarer_id,
        seafarer_name=full_name,
        seafarer_email=seafarer_user.email,
        role_onboard=assignment.role_onboard,
        embark_date=assignment.embark_date.isoformat() if assignment.embark_date else None,
        disembark_date=assignment.disembark_date.isoformat() if assignment.disembark_date else None,
        status=assignment.status,
        created_at=assignment.created_at,
        updated_at=assignment.updated_at,
    )


@router.patch('/companies/{company_id}/assignments/{assignment_id}', response_model=AssignmentResponse)
def update_assignment(
    company_id: str,
    assignment_id: str,
    payload: AssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id != company_id or current_user.role != UserRole.company:
        raise HTTPException(status_code=403, detail='Not authorized')

    assignment = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.company_id == company_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail='Assignment not found')

    if payload.role_onboard is not None:
        assignment.role_onboard = payload.role_onboard
    if payload.embark_date is not None:
        assignment.embark_date = parse_optional_date(payload.embark_date)
    if payload.disembark_date is not None:
        assignment.disembark_date = parse_optional_date(payload.disembark_date)
    if payload.status is not None:
        assignment.status = payload.status

    db.commit()
    db.refresh(assignment)

    user = db.query(User).filter(User.id == assignment.seafarer_id).first()
    seafarer = db.query(Seafarer).filter(Seafarer.id == assignment.seafarer_id).first()
    seafarer_name = user.email.split('@')[0] if user else assignment.seafarer_id
    if seafarer:
        full = f"{(seafarer.first_name or '').strip()} {(seafarer.last_name or '').strip()}".strip()
        if full:
            seafarer_name = full

    return AssignmentResponse(
        id=assignment.id,
        company_id=assignment.company_id,
        vessel_id=assignment.vessel_id,
        seafarer_id=assignment.seafarer_id,
        seafarer_name=seafarer_name,
        seafarer_email=user.email if user else '',
        role_onboard=assignment.role_onboard,
        embark_date=assignment.embark_date.isoformat() if assignment.embark_date else None,
        disembark_date=assignment.disembark_date.isoformat() if assignment.disembark_date else None,
        status=assignment.status,
        created_at=assignment.created_at,
        updated_at=assignment.updated_at,
    )


@router.delete('/companies/{company_id}/assignments/{assignment_id}', status_code=204)
def delete_assignment(
    company_id: str,
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id != company_id or current_user.role != UserRole.company:
        raise HTTPException(status_code=403, detail='Not authorized')

    assignment = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.company_id == company_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail='Assignment not found')

    db.delete(assignment)
    db.commit()
    return None
