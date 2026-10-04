"""Admin API — OCR doc-type rules.

Split out of the former single-file routers/admin.py (T18): code moved verbatim,
only the imports were pruned per module. Routes are aggregated in admin/__init__.py.
"""

import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.deps import require_admin
from app.models.user import User

router = APIRouter()

# ─── Module — OCR Doc Type Rules (Obj.3) ────────────────────────────────────

class DocTypeRulePayload(BaseModel):
    doc_key: str
    expected_keywords: list = []
    red_flag_keywords: list = []
    min_confidence: float = 0.5
    auto_verify_threshold: float = 0.9
    number_regex: Optional[str] = None
    notes: Optional[str] = None


@router.get("/doc-type-rules")
def list_doc_type_rules(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT doc_key, expected_keywords, red_flag_keywords,
               min_confidence, auto_verify_threshold, number_regex, notes, updated_at
        FROM doc_type_rules ORDER BY doc_key
    """)).fetchall()
    return [
        {
            "docKey": r.doc_key,
            "expectedKeywords": r.expected_keywords or [],
            "redFlagKeywords": r.red_flag_keywords or [],
            "minConfidence": r.min_confidence,
            "autoVerifyThreshold": r.auto_verify_threshold,
            "numberRegex": r.number_regex,
            "notes": r.notes,
            "updatedAt": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]


@router.post("/doc-type-rules", status_code=201)
def create_doc_type_rule(
    payload: DocTypeRulePayload,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    existing = db.execute(text("SELECT doc_key FROM doc_type_rules WHERE doc_key = :dk"),
                          {"dk": payload.doc_key}).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Rule for this doc_key already exists")
    db.execute(text("""
        INSERT INTO doc_type_rules
            (doc_key, expected_keywords, red_flag_keywords, min_confidence,
             auto_verify_threshold, number_regex, notes, updated_at)
        VALUES
            (:dk, CAST(:exp AS jsonb), CAST(:red AS jsonb), :min_c, :auto, :rx, :notes, NOW())
    """), {
        "dk": payload.doc_key,
        "exp": json.dumps(payload.expected_keywords),
        "red": json.dumps(payload.red_flag_keywords),
        "min_c": payload.min_confidence,
        "auto": payload.auto_verify_threshold,
        "rx": payload.number_regex,
        "notes": payload.notes,
    })
    db.commit()
    return {"ok": True, "docKey": payload.doc_key}


@router.put("/doc-type-rules/{doc_key:path}")
def update_doc_type_rule(
    doc_key: str,
    payload: DocTypeRulePayload,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    result = db.execute(text("""
        UPDATE doc_type_rules
        SET expected_keywords = CAST(:exp AS jsonb),
            red_flag_keywords = CAST(:red AS jsonb),
            min_confidence = :min_c,
            auto_verify_threshold = :auto,
            number_regex = :rx,
            notes = :notes,
            updated_at = NOW()
        WHERE doc_key = :dk
        RETURNING doc_key
    """), {
        "dk": doc_key,
        "exp": json.dumps(payload.expected_keywords),
        "red": json.dumps(payload.red_flag_keywords),
        "min_c": payload.min_confidence,
        "auto": payload.auto_verify_threshold,
        "rx": payload.number_regex,
        "notes": payload.notes,
    }).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.commit()
    return {"ok": True, "docKey": doc_key}


@router.delete("/doc-type-rules/{doc_key:path}", status_code=204)
def delete_doc_type_rule(
    doc_key: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    db.execute(text("DELETE FROM doc_type_rules WHERE doc_key = :dk"), {"dk": doc_key})
    db.commit()
