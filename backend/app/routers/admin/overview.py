"""Admin API — Overview (me, stats).

Split out of the former single-file routers/admin.py (T18): code moved verbatim,
only the imports were pruned per module. Routes are aggregated in admin/__init__.py.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.deps import require_admin
from app.models.user import User

router = APIRouter()

# ─── Overview ───────────────────────────────────────────────────────────────

@router.get("/me")
def admin_me(admin: User = Depends(require_admin)):
    return {"id": admin.id, "email": admin.email, "role": admin.role}


@router.get("/stats")
def admin_stats(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    seafarers = db.execute(text("SELECT COUNT(*) FROM users WHERE role = 'seafarer'")).scalar()
    companies  = db.execute(text("SELECT COUNT(*) FROM users WHERE role = 'company'")).scalar()
    docs       = db.execute(text("SELECT COUNT(*) FROM documents")).scalar()
    try:
        pending = db.execute(
            text("SELECT COUNT(*) FROM documents WHERE verification_status = 'pending' OR verification_status IS NULL")
        ).scalar()
    except Exception:
        db.rollback()
        pending = docs
    return {"seafarers": seafarers, "companies": companies, "documents": docs, "pending_docs": pending}
