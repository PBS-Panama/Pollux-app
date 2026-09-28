"""Add api_key_config — encrypted OCR API keys, admin-configurable from Settings.

Revision ID: 0009_api_key_config
Revises: 0008_company_approval
Create Date: 2026-09-14

Why
---
Rick's decision (Handover.md nota (48)): the OCR provider keys
(ANTHROPIC_API_KEY / GOOGLE_VISION_API_KEY) become configurable from the
admin panel's Settings screen, instead of only a Cloud Run env var.

Write-only, encrypted, audited — explicitly NOT `platform_settings`:
- `platform_settings` has a GET that returns raw values to the browser. A
  billable API key has no business making that round trip, ever.
- `encrypted_value` reuses `token_crypto.py`'s Fernet helper (already used
  for Drive refresh tokens) — same mechanism, not a new one.
- `hint` is the last 4 chars in the clear, so the panel can show
  "...ab12" without ever reading the real value back.
- `updated_by`/`updated_at`: a billable credential change gets an audit
  trail, same reasoning as `documents.verified_by`.

One row per key name (`ANTHROPIC_API_KEY` | `GOOGLE_VISION_API_KEY` today —
the app-layer whitelists which names are accepted, this table doesn't).

NOT run against production — this migration is created and reviewed here,
but per the deploy gate it does not get applied to leto-postgres without
Rick's explicit authorization.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0009_api_key_config"
down_revision: Union[str, None] = "0008_company_approval"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS api_key_config (
            key_name VARCHAR(64) PRIMARY KEY,
            encrypted_value TEXT NOT NULL,
            hint VARCHAR(16) NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_by VARCHAR(36) NOT NULL REFERENCES users(id)
        )
    """))


def downgrade() -> None:
    op.execute(sa.text("DROP TABLE IF EXISTS api_key_config"))
