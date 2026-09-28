"""Add seafarers.discoverable — visibility opt-out for Discover.

Revision ID: 0007_seafarer_discoverable
Revises: 0006_cv_templates
Create Date: 2026-09-13

Why
---
Rick's decision on the seafarer-discovery model (2026-09-13): a seafarer is
visible in a company's Discover by default, with an opt-out toggle on their
own profile (implemented in pbsds-castor-app's MyProfile.js). GET
/company/seafarers filters on this column in addition to is_active.

Proposed by the Castor dev, confirmed by the Pollux dev (consumes this column
from company.py) — same name and revision on both sides per the coordination
rule.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0007_seafarer_discoverable"
down_revision: Union[str, None] = "0006_cv_templates"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text(
        "ALTER TABLE seafarers ADD COLUMN IF NOT EXISTS "
        "discoverable BOOLEAN NOT NULL DEFAULT TRUE"
    ))


def downgrade() -> None:
    op.execute(sa.text("ALTER TABLE seafarers DROP COLUMN IF EXISTS discoverable"))
