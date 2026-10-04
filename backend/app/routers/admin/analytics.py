"""Admin API — Analytics.

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

# ─── Module 8 — Analytics ────────────────────────────────────────────────────

@router.get("/analytics/overview")
def analytics_overview(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    # Users
    total_users    = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
    seafarers_cnt  = db.execute(text("SELECT COUNT(*) FROM users WHERE role = 'seafarer'")).scalar()
    companies_cnt  = db.execute(text("SELECT COUNT(*) FROM users WHERE role = 'company'")).scalar()
    admins_cnt     = db.execute(text("SELECT COUNT(*) FROM users WHERE role = 'admin'")).scalar()
    new_users_30d  = db.execute(text(
        "SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days'"
    )).scalar()

    # Documents
    total_docs  = db.execute(text("SELECT COUNT(*) FROM documents")).scalar()
    docs_30d    = db.execute(text(
        "SELECT COUNT(*) FROM documents WHERE uploaded_at >= NOW() - INTERVAL '30 days'"
    )).scalar()
    doc_statuses = db.execute(text("""
        SELECT COALESCE(verification_status, 'pending') AS vs, COUNT(*) AS cnt
        FROM documents GROUP BY vs
    """)).fetchall()
    by_status = {r.vs: int(r.cnt) for r in doc_statuses}

    # Seafarers
    with_rank    = db.execute(text(
        "SELECT COUNT(*) FROM seafarers WHERE rank IS NOT NULL AND rank != ''"
    )).scalar()
    without_rank = db.execute(text(
        "SELECT COUNT(*) FROM seafarers WHERE rank IS NULL OR rank = ''"
    )).scalar()
    available    = db.execute(text(
        "SELECT COUNT(*) FROM seafarers WHERE is_available = true"
    )).scalar()
    by_fleet = db.execute(text("""
        SELECT COALESCE(fleet_category, 'unknown') AS cat, COUNT(*) AS cnt
        FROM seafarers GROUP BY cat ORDER BY cnt DESC
    """)).fetchall()
    fleet_breakdown = {r.cat: int(r.cnt) for r in by_fleet}

    # Platform counts
    rels_total   = db.execute(text("SELECT COUNT(*) FROM relationships")).scalar()
    rels_active  = db.execute(text("SELECT COUNT(*) FROM relationships WHERE status = 'active'")).scalar()
    exam_courses = db.execute(text("SELECT COUNT(*) FROM exam_courses WHERE is_active = true")).scalar()
    tc_count     = db.execute(text("SELECT COUNT(*) FROM training_centers WHERE is_active = true")).scalar()
    lr_series    = db.execute(text("SELECT COUNT(*) FROM learning_series WHERE is_published = true")).scalar()

    # Registrations last 7 days (daily)
    daily_regs = db.execute(text("""
        SELECT DATE_TRUNC('day', created_at)::date AS day, COUNT(*) AS cnt
        FROM users
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY day ORDER BY day
    """)).fetchall()
    daily_registrations = [
        {"date": str(r.day), "count": int(r.cnt)} for r in daily_regs
    ]

    return {
        "users": {
            "total": int(total_users),
            "seafarers": int(seafarers_cnt),
            "companies": int(companies_cnt),
            "admins": int(admins_cnt),
            "new_30d": int(new_users_30d),
        },
        "documents": {
            "total": int(total_docs),
            "new_30d": int(docs_30d),
            "by_status": by_status,
        },
        "seafarers": {
            "with_rank": int(with_rank),
            "without_rank": int(without_rank),
            "available": int(available),
            "by_fleet_category": fleet_breakdown,
        },
        "platform": {
            "relationships_total": int(rels_total),
            "active_relationships": int(rels_active),
            "exam_courses_active": int(exam_courses),
            "training_centers_active": int(tc_count),
            "learning_series_published": int(lr_series),
        },
        "daily_registrations": daily_registrations,
    }
