"""Add vessels + crew_assignments — "Mi Flota" (company fleet & crew rotations).

Revision ID: 0003_fleet_and_staff
Revises: 0002_widen_documents_doc_key
Create Date: 2026-09-12

Why
---
Rick asked for a "Mi Flota" section: a company registers its own vessels and
assigns already-hired seafarers (the existing `relationships` table — until
now written only by the admin panel's manual "+ New" button, never by the
company side) to onboard rotations, to coordinate embarkation/disembarkation
and vacation coverage. There was previously no vessel entity at all —
`companies.fleet_size` is just a bare integer typed at signup.

Replicated identically in pbsds-castor-app/backend (same shared leto-postgres
DB in production — schema changes must be applied in both copies).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_fleet_and_staff"
down_revision: Union[str, None] = "0002_widen_documents_doc_key"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_DDL: list[str] = [
    """CREATE TABLE IF NOT EXISTS vessels (
        id VARCHAR(36) PRIMARY KEY,
        company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        vessel_type VARCHAR(50),
        flag_country VARCHAR(100),
        imo_number VARCHAR(20),
        mmsi_number VARCHAR(20),
        crew_capacity INTEGER,
        photo_b64 TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )""",
    """CREATE TABLE IF NOT EXISTS crew_assignments (
        id VARCHAR(36) PRIMARY KEY,
        vessel_id VARCHAR(36) NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
        seafarer_id VARCHAR(36) NOT NULL REFERENCES seafarers(id),
        company_id VARCHAR(36) NOT NULL REFERENCES companies(id),
        rank VARCHAR(100) NOT NULL,
        embark_date DATE NOT NULL,
        disembark_date DATE,
        status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )""",
    "CREATE INDEX IF NOT EXISTS crew_assignments_vessel_idx ON crew_assignments (vessel_id)",
    "CREATE INDEX IF NOT EXISTS crew_assignments_company_idx ON crew_assignments (company_id)",
    "CREATE INDEX IF NOT EXISTS vessels_company_idx ON vessels (company_id)",
]


def upgrade() -> None:
    for stmt in _DDL:
        op.execute(sa.text(stmt))


def downgrade() -> None:
    op.execute(sa.text("DROP TABLE IF EXISTS crew_assignments"))
    op.execute(sa.text("DROP TABLE IF EXISTS vessels"))
