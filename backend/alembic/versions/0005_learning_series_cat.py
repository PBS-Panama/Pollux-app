"""Add learning_series.industry_category / rank_level.

Revision ID: 0005_learning_series_cat
Revises: 0004_ocr_feedback_seafarer_id
Create Date: 2026-09-12

Why
---
learning_series was never declared as an ORM model or covered by any prior
migration — it was created by a raw CREATE TABLE in main.py that has since
been archived to main.py.bak. Both routers/learning.py copies (Castor and
Pollux) select/insert industry_category and rank_level, but this database's
copy of the table predates those columns, so every admin Learning CMS call
(list/create series) 500ed, and the public GET /api/learning/series a
seafarer's Learning tab calls would too. pbsds-castor-app's local dev DB
happens to already have these columns (created at a different point in
history) — this migration brings this database in line with what the code
on both sides actually expects.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005_learning_series_cat"
down_revision: Union[str, None] = "0004_ocr_feedback_seafarer_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text(
        "ALTER TABLE learning_series ADD COLUMN IF NOT EXISTS "
        "industry_category VARCHAR(32) NOT NULL DEFAULT 'general'"
    ))
    op.execute(sa.text(
        "ALTER TABLE learning_series ADD COLUMN IF NOT EXISTS "
        "rank_level VARCHAR(16) NOT NULL DEFAULT 'all'"
    ))


def downgrade() -> None:
    op.execute(sa.text("ALTER TABLE learning_series DROP COLUMN IF EXISTS industry_category"))
    op.execute(sa.text("ALTER TABLE learning_series DROP COLUMN IF EXISTS rank_level"))
