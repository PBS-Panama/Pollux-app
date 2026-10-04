"""Admin API — Admin alerts (frontend fallback log).

Split out of the former single-file routers/admin.py (T18): code moved verbatim,
only the imports were pruned per module. Routes are aggregated in admin/__init__.py.
"""

import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.rate_limit import limiter

router = APIRouter()

# ─── Module 9 — Admin Alerts (fallback log from frontend) ───────────────────

class AlertCreate(BaseModel):
    level: str = "warn"           # info | warn | error
    source: str = Field(max_length=100)  # e.g. "Library.js", "Compliance.js"
    message: str = Field(max_length=2000)
    context: Optional[dict] = None

    @field_validator("context")
    @classmethod
    def _cap_context(cls, v):
        if v is not None and len(json.dumps(v)) > MAX_ALERT_CONTEXT_CHARS:
            raise ValueError("context too large")
        return v


MAX_ALERT_CONTEXT_CHARS = 4000


@router.post("/alerts", status_code=201)
@limiter.limit("20/minute")
def create_alert(
    request: Request,
    payload: AlertCreate,
    db: Session = Depends(get_db),
):
    """
    Open endpoint (no auth required) — frontend posts here when it falls back
    to local crewDocData.js because the backend required-docs endpoint was
    unavailable.  Logs to admin_alerts table for ops visibility.
    """
    import uuid as _uuid
    now = datetime.now(timezone.utc)
    db.execute(text("""
        INSERT INTO admin_alerts (id, level, source, message, context, created_at)
        VALUES (:id, :level, :source, :message, CAST(:context AS jsonb), :now)
    """), {
        "id": str(_uuid.uuid4()),
        "level": payload.level if payload.level in ("info", "warn", "error") else "warn",
        "source": payload.source[:100],
        "message": payload.message,
        "context": json.dumps(payload.context) if payload.context else None,
        "now": now,
    })
    db.commit()
    return {"ok": True}
