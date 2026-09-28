"""Password reset — users.password_changed_at, password_reset_tokens.

Revision ID: 0011_password_reset
Revises: 0010_polar_v4_title_fix
Create Date: 2026-09-15

Why
---
Handover.md nota (58): Rick approved a password-recovery flow before launch.
Two things had to exist first, and neither did:

- password_reset_tokens: same convention as email_verification_tokens
  (nota (8)) — a token row looked up by its opaque string, single-use
  (used_at), time-boxed (expires_at). Not an ORM model.
- users.password_changed_at: JWTs here are stateless (security.py signs only
  `exp`, no `iat`, no server-side session store) — so today, changing a
  password does not invalidate any token already issued. If an account is
  compromised, the attacker keeps working access until their own token
  expires on its own schedule (up to 8h for access, 7 days for refresh),
  regardless of the victim changing the password. This column, combined with
  `iat` now being signed into every token (security.py) and a check in
  get_current_user (deps.py) that rejects any token issued before this
  timestamp, is what actually revokes old sessions on password change/reset.
  NULL means "never changed since this column existed" — deliberately not
  backfilled to NOW() for existing rows, since that would invalidate every
  session live today for no reason; the check treats NULL as "no
  invalidation point yet".

`users.updated_at` was considered and rejected for this — it changes on ANY
write to the row, including an unrelated admin edit, and would revoke valid
sessions for no reason. This needs its own column.

NOT run against production — this migration is created and reviewed here,
but per the deploy gate it does not get applied to leto-postgres without
Rick's explicit authorization. See Handover.md for the exact command.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0011_password_reset"
down_revision: Union[str, None] = "0010_polar_v4_title_fix"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ"
    ))
    op.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token VARCHAR(64) NOT NULL UNIQUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ
        )
    """))
    op.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens(user_id)"
    ))


def downgrade() -> None:
    op.execute(sa.text("DROP TABLE IF EXISTS password_reset_tokens"))
    op.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS password_changed_at"))
