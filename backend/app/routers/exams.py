import json
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db

router = APIRouter()


@router.get("/exams/courses")
def list_exam_courses(
    db: Session = Depends(get_db),
    level: str = Query(""),
    department: str = Query(""),
    search: str = Query(""),
):
    where = ["is_active = true"]
    params: dict = {}

    if level:
        where.append("level = :level")
        params["level"] = level
    if department:
        where.append("departments @> :dept::jsonb")
        params["dept"] = json.dumps([department])
    if search:
        where.append("(name ILIKE :search OR code ILIKE :search OR stcw_ref ILIKE :search)")
        params["search"] = f"%{search}%"

    where_sql = " AND ".join(where)
    rows = db.execute(text(f"""
        SELECT id, name, code, stcw_ref, level, departments, description, duration, validity
        FROM exam_courses
        WHERE {where_sql}
        ORDER BY
            CASE level
                WHEN 'All Levels' THEN 1
                WHEN 'Ratings' THEN 2
                WHEN 'OOW' THEN 3
                WHEN 'Management' THEN 4
                ELSE 5
            END,
            name ASC
    """), params).fetchall()

    return [
        {
            "id": r.id,
            "name": r.name,
            "code": r.code,
            "stcwRef": r.stcw_ref,
            "level": r.level,
            "departments": r.departments if isinstance(r.departments, list) else json.loads(r.departments or "[]"),
            "description": r.description,
            "duration": r.duration,
            "validity": r.validity,
        }
        for r in rows
    ]


@router.get("/exams/centers")
def list_training_centers(
    db: Session = Depends(get_db),
    city: str = Query(""),
    search: str = Query(""),
):
    where = ["is_active = true"]
    params: dict = {}

    if city:
        where.append("city ILIKE :city")
        params["city"] = f"%{city}%"
    if search:
        where.append("(name ILIKE :search OR abbreviation ILIKE :search OR district ILIKE :search)")
        params["search"] = f"%{search}%"

    where_sql = " AND ".join(where)
    rows = db.execute(text(f"""
        SELECT id, name, abbreviation, city, district, type, resolution, website, courses_count, specialties, notes
        FROM training_centers
        WHERE {where_sql}
        ORDER BY courses_count DESC NULLS LAST, name ASC
    """), params).fetchall()

    return [
        {
            "id": r.id,
            "name": r.name,
            "abbreviation": r.abbreviation,
            "city": r.city,
            "district": r.district,
            "type": r.type,
            "resolution": r.resolution,
            "website": r.website,
            "courses_count": r.courses_count,
            "specialties": r.specialties if isinstance(r.specialties, list) else json.loads(r.specialties or "[]"),
            "notes": r.notes,
        }
        for r in rows
    ]
