"""Add cv_templates — admin-editable CV template (placeholders + branding).

Revision ID: 0006_cv_templates
Revises: 0005_learning_series_cat
Create Date: 2026-09-12

Why
---
Same fix as pbsds-castor-app's migration of the same name (shared
leto-postgres DB in production). See that file's docstring for the full
story: the company-facing "Download CV" button had never been wired to
anything. This table lets the admin panel view/edit the CV's HTML template
and branding (logo, accent color); the company-side download endpoint
renders it with a real seafarer's data. Single-row table (id='default').
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006_cv_templates"
down_revision: Union[str, None] = "0005_learning_series_cat"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS cv_templates (
            id VARCHAR(20) PRIMARY KEY DEFAULT 'default',
            html_template TEXT NOT NULL,
            logo_b64 TEXT,
            accent_color VARCHAR(7) NOT NULL DEFAULT '#0ea5e9',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))


def downgrade() -> None:
    op.execute(sa.text("DROP TABLE IF EXISTS cv_templates"))
