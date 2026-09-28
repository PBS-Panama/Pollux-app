"""
Seafarer code generation — format: CS-{ISO2}-{NNNN}

CS   = Castor platform prefix (changed from LT- on 2026-09-13, ahead of the
       shared prod migration — Rick's call: codes are user-facing and Castor
       is the brand, not the historic "Leto" infra name. Prod had zero live
       seafarer_code rows at the time of the switch, so there was no data to
       migrate or reconcile.)
ISO2 = 2-letter uppercase country code derived from nationality
NNNN = zero-padded sequential number, scoped per country prefix

Codes are assigned at registration and never change, even if nationality updates later.
"""
from sqlalchemy.orm import Session
from sqlalchemy import text


def generate_seafarer_code(db: Session, nationality: str | None) -> str:
    """Return next available CS-XX-NNNN code for the given nationality."""
    country = (nationality[:2].upper() if nationality and len(nationality) >= 2 else "XX")
    prefix = f"CS-{country}"
    row = db.execute(
        text(
            "SELECT MAX(CAST(SUBSTRING(seafarer_code FROM 7) AS INTEGER)) "
            "FROM users WHERE seafarer_code LIKE :like"
        ),
        {"like": f"{prefix}-%"},
    ).scalar()
    next_n = (row or 0) + 1
    return f"{prefix}-{next_n:04d}"
