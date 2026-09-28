"""Widen documents.doc_key from VARCHAR(80) to VARCHAR(300).

Revision ID: 0002_widen_documents_doc_key
Revises: 0001_baseline
Create Date: 2026-09-12

Why
---
The column was declared VARCHAR(80) under the assumption it would hold a short
slug ("bst"), but the frontend has always sent the full document-type display
name as doc_key (matching doc_type_rules.doc_key, which is VARCHAR(300)) — see
apiClient.js's uploadDocument(). Four catalog entries exceed 80 characters
(e.g. "IMO 1.23 — Proficiency in Survival Craft and Rescue Boats (excl. Fast
Rescue Boats)", 85 chars), so uploading any of them hit a Postgres
StringDataRightTruncation error, surfaced to the user as an unhandled 500 on
POST /api/seafarer/me/documents/sync.

Replicated from pbsds-castor-app/backend (same shared leto-postgres DB in
production — schema changes must be applied identically in both copies).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_widen_documents_doc_key"
down_revision: Union[str, None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("ALTER TABLE documents ALTER COLUMN doc_key TYPE VARCHAR(300)"))


def downgrade() -> None:
    # Not reversible in general — a doc_key longer than 80 chars would be
    # truncated/rejected. No known data currently exceeds it either way.
    op.execute(sa.text("ALTER TABLE documents ALTER COLUMN doc_key TYPE VARCHAR(80)"))
