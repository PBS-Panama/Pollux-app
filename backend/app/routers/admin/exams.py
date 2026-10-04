"""Admin API — Exams and training centers.

Split out of the former single-file routers/admin.py (T18): code moved verbatim,
only the imports were pruned per module. Routes are aggregated in admin/__init__.py.
"""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text, bindparam
from sqlalchemy.dialects.postgresql import JSONB
from app.db.session import get_db
from app.core.deps import require_admin
from app.models.user import User

router = APIRouter()

# ─── Module 5 — Exams & Training Centers ────────────────────────────────────

import json as _json
from typing import List


class ExamCourseCreate(BaseModel):
    name: str
    code: str = ""
    stcw_ref: str = ""
    level: str = "All Levels"
    departments: List[str] = []
    description: str = ""
    duration: str = ""
    validity: str = ""


class ExamCourseUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    stcw_ref: Optional[str] = None
    level: Optional[str] = None
    departments: Optional[List[str]] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    validity: Optional[str] = None
    is_active: Optional[bool] = None


class TrainingCenterCreate(BaseModel):
    name: str
    abbreviation: str = ""
    city: str = ""
    district: str = ""
    type: str = ""
    resolution: str = ""
    website: Optional[str] = None
    courses_count: Optional[int] = None
    specialties: List[str] = []
    notes: str = ""


class TrainingCenterUpdate(BaseModel):
    name: Optional[str] = None
    abbreviation: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    type: Optional[str] = None
    resolution: Optional[str] = None
    website: Optional[str] = None
    courses_count: Optional[int] = None
    specialties: Optional[List[str]] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/exams/courses")
def admin_list_exam_courses(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    level: str = Query(""),
    search: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    where = ["1=1"]
    params: dict = {}
    if level:
        where.append("level = :level")
        params["level"] = level
    if search:
        where.append("(name ILIKE :search OR code ILIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = " AND ".join(where)
    offset = (page - 1) * limit
    params.update({"limit": limit, "offset": offset})
    rows = db.execute(text(f"""
        SELECT id, name, code, stcw_ref, level, departments, description, duration, validity, is_active
        FROM exam_courses WHERE {where_sql}
        ORDER BY CASE level WHEN 'All Levels' THEN 1 WHEN 'Ratings' THEN 2 WHEN 'OOW' THEN 3 WHEN 'Management' THEN 4 ELSE 5 END, name ASC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()
    total = db.execute(
        text(f"SELECT COUNT(*) FROM exam_courses WHERE {where_sql}"),
        {k: v for k, v in params.items() if k not in ("limit", "offset")},
    ).scalar()
    return {
        "total": total, "page": page, "pages": max(1, -(-total // limit)),
        "items": [
            {
                "id": r.id, "name": r.name, "code": r.code, "stcw_ref": r.stcw_ref,
                "level": r.level,
                "departments": r.departments if isinstance(r.departments, list) else _json.loads(r.departments or "[]"),
                "description": r.description, "duration": r.duration,
                "validity": r.validity, "is_active": r.is_active,
            }
            for r in rows
        ],
    }


@router.post("/exams/courses", status_code=201)
def admin_create_exam_course(
    payload: ExamCourseCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    import uuid as _uuid
    new_id = str(_uuid.uuid4())
    now = datetime.now(timezone.utc)
    _stmt = text(
        "INSERT INTO exam_courses (id, name, code, stcw_ref, level, departments, description, duration, validity, created_at, updated_at) "
        "VALUES (:id, :name, :code, :stcw_ref, :level, :departments, :description, :duration, :validity, :now, :now)"
    ).bindparams(bindparam("departments", type_=JSONB))
    db.execute(_stmt, {
        "id": new_id, "name": payload.name, "code": payload.code, "stcw_ref": payload.stcw_ref,
        "level": payload.level, "departments": payload.departments,
        "description": payload.description, "duration": payload.duration,
        "validity": payload.validity, "now": now,
    })
    db.commit()
    return {"id": new_id}


@router.patch("/exams/courses/{course_id}")
def admin_update_exam_course(
    course_id: str,
    payload: ExamCourseUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    sets = []
    params: dict = {"id": course_id, "now": datetime.now(timezone.utc)}
    for field, val in payload.model_dump(exclude_unset=True).items():
        if field == "departments":
            sets.append("departments = :departments")
            params["departments"] = _json.dumps(val)
        else:
            sets.append(f"{field} = :{field}")
            params[field] = val
    if not sets:
        raise HTTPException(status_code=400, detail="No fields to update")
    sets.append("updated_at = :now")
    result = db.execute(
        text(f"UPDATE exam_courses SET {', '.join(sets)} WHERE id = :id RETURNING id"), params
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Course not found")
    db.commit()
    return {"id": course_id}


@router.delete("/exams/courses/{course_id}", status_code=204)
def admin_delete_exam_course(
    course_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    result = db.execute(
        text("DELETE FROM exam_courses WHERE id = :id RETURNING id"), {"id": course_id}
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Course not found")
    db.commit()


@router.get("/exams/centers")
def admin_list_training_centers(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    search: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    where = ["1=1"]
    params: dict = {}
    if search:
        where.append("(name ILIKE :search OR abbreviation ILIKE :search OR city ILIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = " AND ".join(where)
    offset = (page - 1) * limit
    params.update({"limit": limit, "offset": offset})
    rows = db.execute(text(f"""
        SELECT id, name, abbreviation, city, district, type, resolution, website, courses_count, specialties, notes, is_active
        FROM training_centers WHERE {where_sql}
        ORDER BY courses_count DESC NULLS LAST, name ASC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()
    total = db.execute(
        text(f"SELECT COUNT(*) FROM training_centers WHERE {where_sql}"),
        {k: v for k, v in params.items() if k not in ("limit", "offset")},
    ).scalar()
    return {
        "total": total, "page": page, "pages": max(1, -(-total // limit)),
        "items": [
            {
                "id": r.id, "name": r.name, "abbreviation": r.abbreviation,
                "city": r.city, "district": r.district, "type": r.type,
                "resolution": r.resolution, "website": r.website,
                "courses_count": r.courses_count,
                "specialties": r.specialties if isinstance(r.specialties, list) else _json.loads(r.specialties or "[]"),
                "notes": r.notes, "is_active": r.is_active,
            }
            for r in rows
        ],
    }


@router.post("/exams/centers", status_code=201)
def admin_create_training_center(
    payload: TrainingCenterCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    import uuid as _uuid
    new_id = str(_uuid.uuid4())
    now = datetime.now(timezone.utc)
    _tc_stmt = text(
        "INSERT INTO training_centers (id, name, abbreviation, city, district, type, resolution, website, courses_count, specialties, notes, created_at, updated_at) "
        "VALUES (:id, :name, :abbreviation, :city, :district, :type, :resolution, :website, :courses_count, :specialties, :notes, :now, :now)"
    ).bindparams(bindparam("specialties", type_=JSONB))
    db.execute(_tc_stmt, {
        "id": new_id, "name": payload.name, "abbreviation": payload.abbreviation,
        "city": payload.city, "district": payload.district, "type": payload.type,
        "resolution": payload.resolution, "website": payload.website,
        "courses_count": payload.courses_count,
        "specialties": payload.specialties, "notes": payload.notes, "now": now,
    })
    db.commit()
    return {"id": new_id}


@router.patch("/exams/centers/{center_id}")
def admin_update_training_center(
    center_id: str,
    payload: TrainingCenterUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    sets = []
    params: dict = {"id": center_id, "now": datetime.now(timezone.utc)}
    for field, val in payload.model_dump(exclude_unset=True).items():
        if field == "specialties":
            sets.append("specialties = :specialties")
            params["specialties"] = _json.dumps(val)
        else:
            sets.append(f"{field} = :{field}")
            params[field] = val
    if not sets:
        raise HTTPException(status_code=400, detail="No fields to update")
    sets.append("updated_at = :now")
    result = db.execute(
        text(f"UPDATE training_centers SET {', '.join(sets)} WHERE id = :id RETURNING id"), params
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Center not found")
    db.commit()
    return {"id": center_id}


@router.delete("/exams/centers/{center_id}", status_code=204)
def admin_delete_training_center(
    center_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    result = db.execute(
        text("DELETE FROM training_centers WHERE id = :id RETURNING id"), {"id": center_id}
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Center not found")
    db.commit()
