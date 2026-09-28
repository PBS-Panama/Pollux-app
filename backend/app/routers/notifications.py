"""The campanita — any authenticated user, always self-scoped (E-1, Task 3).
No admin override here: an admin sees their OWN notifications through this
same router, not everyone else's — that's a different, not-yet-built admin
ops view, not this."""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.notification import Notification
from app.models.user import User

router = APIRouter()


def _out(n: Notification) -> dict:
    return {
        "id": n.id,
        "recipient_scope": n.recipient_scope,
        "company_id": n.company_id,
        "kind": n.kind,
        "subject_type": n.subject_type,
        "subject_id": n.subject_id,
        "title": n.title,
        "body": n.body,
        "created_at": n.created_at.isoformat() if n.created_at else None,
        "read_at": n.read_at.isoformat() if n.read_at else None,
        "requires_ack": n.requires_ack,
        "acknowledged_at": n.acknowledged_at.isoformat() if n.acknowledged_at else None,
    }


def _own_or_404(db: Session, notification_id: str, user_id: str) -> Notification:
    """Same non-disclosure principle used everywhere else this session
    (company.py's guards, embarkations.py's _get_own_embarkation_or_404):
    another user's notification is a 404, never a 403 — a 403 would confirm
    the id exists."""
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if n is None or n.recipient_user_id != user_id:
        raise HTTPException(status_code=404, detail="Notification not found")
    return n


@router.get("/notifications/me")
def list_own_notifications(
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Notification).filter(Notification.recipient_user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.read_at.is_(None))
    rows = query.order_by(Notification.created_at.desc()).all()
    return {"items": [_out(n) for n in rows]}


@router.patch("/notifications/{notification_id}/read")
def mark_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = _own_or_404(db, notification_id, current_user.id)
    if n.read_at is None:
        n.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(n)
    return _out(n)


@router.post("/notifications/{notification_id}/acknowledge")
def acknowledge(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = _own_or_404(db, notification_id, current_user.id)
    if not n.requires_ack:
        raise HTTPException(status_code=400, detail="This notification does not require acknowledgement")
    if n.acknowledged_at is None:
        now = datetime.now(timezone.utc)
        n.acknowledged_at = now
        n.acknowledged_by = current_user.id
        if n.read_at is None:
            n.read_at = now
        db.commit()
        db.refresh(n)
    return _out(n)
