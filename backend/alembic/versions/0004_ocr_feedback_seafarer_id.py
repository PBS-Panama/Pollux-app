"""Add ocr_feedback_log.seafarer_id — column was referenced by code but never created.

Revision ID: 0004_ocr_feedback_seafarer_id
Revises: 0003_fleet_and_staff
Create Date: 2026-09-12

Why
---
GET /admin/ocr-feedback selects seafarer_id from ocr_feedback_log, and the
verify-document handler inserts it — but the column never existed. The
SELECT 500ed (found via the admin UI's "OCR Feedback" page). Worse, the
INSERT was wrapped in a silent `except Exception: pass` (never block the
verify response on logging failure), so every admin verify/reject action
has been failing to log feedback since this feature was built — the table
was completely empty. Both call sites are unchanged; adding the column is
the actual fix.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004_ocr_feedback_seafarer_id"
down_revision: Union[str, None] = "0003_fleet_and_staff"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("ALTER TABLE ocr_feedback_log ADD COLUMN IF NOT EXISTS seafarer_id VARCHAR(36)"))


def downgrade() -> None:
    op.execute(sa.text("ALTER TABLE ocr_feedback_log DROP COLUMN IF EXISTS seafarer_id"))
