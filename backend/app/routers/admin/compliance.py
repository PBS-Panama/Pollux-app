"""Admin API — Compliance monitor.

Split out of the former single-file routers/admin.py (T18): code moved verbatim,
only the imports were pruned per module. Routes are aggregated in admin/__init__.py.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.deps import require_admin
from app.models.user import User
from app.models.seafarer import Seafarer
from app.models.document import Document
from app.services.compliance_engine import build_compliance_report

router = APIRouter()

# ─── Module 3 — Compliance Monitor ─────────────────────────────────────────

@router.get("/compliance/overview")
def compliance_overview(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    seafarers = (
        db.query(Seafarer)
        .join(User, Seafarer.id == User.id)
        .filter(User.is_active == True, Seafarer.rank.isnot(None), Seafarer.rank != "")
        .all()
    )

    scores = []
    rank_data: dict = {}
    fully_compliant = 0
    critical_blocked = 0

    for s in seafarers:
        verified_docs = (
            db.query(Document)
            .filter(Document.seafarer_id == s.id, Document.verification_status == "verified")
            .all()
        )
        report = build_compliance_report(
            s.rank, verified_docs, db=db,
            coc_type=getattr(s, "coc_type", None),
            cop_tanker_type=getattr(s, "cop_tanker_type", None),
            cop_tanker_level=getattr(s, "cop_tanker_level", None),
            flag_endorsements=getattr(s, "flag_endorsements", None),
            special_endorsements=getattr(s, "special_endorsements", None),
            vessel_type_ids=getattr(s, "vessel_types", None),
        )
        score_pct = round(report.compliance_score * 100)
        scores.append(score_pct)

        if report.is_fully_compliant:
            fully_compliant += 1
        if not report.can_be_listed:
            critical_blocked += 1

        rank_data.setdefault(s.rank, []).append(score_pct)

    avg_score = round(sum(scores) / len(scores)) if scores else 0

    distribution = [0, 0, 0, 0]
    for sc in scores:
        if sc <= 25:
            distribution[0] += 1
        elif sc <= 50:
            distribution[1] += 1
        elif sc <= 75:
            distribution[2] += 1
        else:
            distribution[3] += 1

    rank_breakdown = sorted(
        [
            {"rank": rank, "count": len(rs), "avg_score": round(sum(rs) / len(rs))}
            for rank, rs in rank_data.items()
        ],
        key=lambda x: -x["avg_score"],
    )

    expiry_rows = db.execute(text("""
        SELECT d.name, d.expiry_date, d.verification_status,
               s.first_name, s.last_name, s.rank,
               (d.expiry_date::date - CURRENT_DATE) AS days_left
        FROM documents d
        JOIN seafarers s ON d.seafarer_id = s.id
        WHERE d.expiry_date IS NOT NULL
          AND d.expiry_date::date >= CURRENT_DATE
          AND d.expiry_date::date <= (CURRENT_DATE + INTERVAL '90 days')
        ORDER BY d.expiry_date ASC
        LIMIT 50
    """)).fetchall()

    expiry_alerts = [
        {
            "seafarer_name": f"{r.first_name} {r.last_name}",
            "rank": r.rank,
            "doc_name": r.name,
            "expiry_date": r.expiry_date.isoformat() if hasattr(r.expiry_date, "isoformat") else str(r.expiry_date),
            "days_left": int(r.days_left) if r.days_left is not None else 0,
            "verification_status": r.verification_status or "pending",
        }
        for r in expiry_rows
    ]

    return {
        "summary": {
            "total_seafarers_with_rank": len(seafarers),
            "avg_score": avg_score,
            "fully_compliant": fully_compliant,
            "critical_blocked": critical_blocked,
        },
        "distribution": {
            "labels": ["0–25%", "26–50%", "51–75%", "76–100%"],
            "values": distribution,
        },
        "rank_breakdown": rank_breakdown,
        "expiry_alerts": expiry_alerts,
    }
