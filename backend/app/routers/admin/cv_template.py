"""Admin API — CV template.

Split out of the former single-file routers/admin.py (T18): code moved verbatim,
only the imports were pruned per module. Routes are aggregated in admin/__init__.py.
"""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.deps import require_admin
from app.models.user import User

router = APIRouter()

# ─── Module 8 — CV Template (branding + placeholders for company downloads) ──
# Single-row table (id='default'). The rendered HTML is what
# /company/seafarers/{id}/cv (company.py) fills in with a real seafarer's
# data and converts to PDF — this only edits the template + branding.

from app.services.cv_generator import render_template as _render_cv_template, SAMPLE_CONTEXT as _CV_SAMPLE_CONTEXT


class CvTemplatePatch(BaseModel):
    html_template: Optional[str] = None
    logo_b64: Optional[str] = None
    accent_color: Optional[str] = None


@router.get("/cv-template")
def get_cv_template(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.execute(text(
        "SELECT html_template, logo_b64, accent_color, updated_at FROM cv_templates WHERE id = 'default'"
    )).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="CV template not found")
    return {
        "html_template": row.html_template,
        "logo_b64": row.logo_b64,
        "accent_color": row.accent_color,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


@router.patch("/cv-template")
def update_cv_template(
    payload: CvTemplatePatch,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    col_map = {"html_template": "html_template", "logo_b64": "logo_b64", "accent_color": "accent_color"}
    set_clauses = ", ".join(f"{col_map[k]} = :{k}" for k in updates)
    params = dict(updates)
    params["now"] = datetime.now(timezone.utc)
    result = db.execute(text(f"""
        UPDATE cv_templates SET {set_clauses}, updated_at = :now
        WHERE id = 'default'
        RETURNING html_template, logo_b64, accent_color, updated_at
    """), params).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="CV template not found")
    db.commit()
    return {
        "html_template": result.html_template,
        "logo_b64": result.logo_b64,
        "accent_color": result.accent_color,
        "updated_at": result.updated_at.isoformat() if result.updated_at else None,
    }


class CvTemplatePreviewPayload(BaseModel):
    html_template: Optional[str] = None
    logo_b64: Optional[str] = None
    accent_color: Optional[str] = None


@router.post("/cv-template/preview")
def preview_cv_template(
    payload: CvTemplatePreviewPayload,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Renders the given (possibly unsaved) template/branding with sample
    data — lets the admin see edits live before hitting Save."""
    row = db.execute(text(
        "SELECT html_template, logo_b64, accent_color FROM cv_templates WHERE id = 'default'"
    )).fetchone()
    html_template = payload.html_template if payload.html_template is not None else (row.html_template if row else "")
    logo_b64 = payload.logo_b64 if payload.logo_b64 is not None else (row.logo_b64 if row else None)
    accent_color = payload.accent_color if payload.accent_color is not None else (row.accent_color if row else "#0ea5e9")
    rendered = _render_cv_template(html_template, _CV_SAMPLE_CONTEXT, logo_b64, accent_color)
    return {"html": rendered}
