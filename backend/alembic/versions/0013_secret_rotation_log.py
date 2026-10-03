"""Add secret_rotation_log — audit trail for the infra secrets panel (T8/T9).

Revision ID: 0013_secret_rotation_log
Revises: 0012_embarkations_foundation
Create Date: 2026-10-03

Why
---
T8 (docs/specs/secrets-panel.md) designed a panel to rotate infra secrets
(SECRET_KEY, DRIVE_TOKEN_SECRET, DRIVE_STATE_SECRET, GOOGLE_DRIVE_CLIENT_SECRET)
from Settings, same spirit as `api_key_config` (0009) but for secrets that
live in Secret Manager/env vars, not in this table. Every action the panel
takes gets logged here: who, what, when, which Secret Manager version — NEVER
the value itself. `detail` is a short human message (e.g. "re-encrypted 3
drive_tokens rows"), never a secret.

SHARED DATABASE (leto-postgres): this table is read/written by whichever
backend's panel performs an action, but a secret rotation (SECRET_KEY,
DRIVE_TOKEN_SECRET) affects BOTH Pollux and Castor since they share these
secrets. Castor's repo needs this EXACT same migration (same revision id,
same filename, same down_revision) before either side deploys past 0012 —
otherwise `alembic upgrade head` on whichever one runs second won't find a
common history and aborts (same class of problem as the 0003-0006 renumber
incident, Handover.md). Not run against production by this migration itself
— per the deploy gate, applying it to leto-postgres needs Rick's explicit
authorization, same as every migration since 0007.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0013_secret_rotation_log"
down_revision: Union[str, None] = "0012_embarkations_foundation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS secret_rotation_log (
            id UUID PRIMARY KEY,
            secret_name VARCHAR(64) NOT NULL,
            action VARCHAR(16) NOT NULL,
            secret_version VARCHAR(32) NOT NULL,
            result VARCHAR(16) NOT NULL,
            detail VARCHAR(500),
            performed_by VARCHAR(36) NOT NULL REFERENCES users(id),
            performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))
    op.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS idx_secret_rotation_log_name
        ON secret_rotation_log (secret_name, performed_at DESC)
    """))


def downgrade() -> None:
    op.execute(sa.text("DROP TABLE IF EXISTS secret_rotation_log"))
