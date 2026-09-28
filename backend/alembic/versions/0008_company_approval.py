"""Add company approval — companies.company_status, users.email_verified, email_verification_tokens.

Revision ID: 0008_company_approval
Revises: 0007_seafarer_discoverable
Create Date: 2026-09-14

Why
---
Rick's decision (2026-09-13/14): a `company` account gets real access only
after email verification AND manual admin approval — today `role == "company"`
is the whole gate, and POST /auth/register hands out immediate, unverified
access to a role that can see/export seafarer data.

- companies.company_status: pending -> approved | rejected (state machine).
- companies.rejection_reason: set when an admin rejects, shown back to the
  company.
- users.email_verified: separate from company_status — a company needs BOTH
  before the endpoint gate opens.
- email_verification_tokens: not an ORM model, same convention as
  drive_tokens/relationships/vessels — a token row is looked up by its opaque
  token string, single-use (used_at), time-boxed (expires_at).

NOT run against production — this migration is created and reviewed here,
but per the deploy gate it does not get applied to leto-postgres without
Rick's explicit authorization.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0008_company_approval"
down_revision: Union[str, None] = "0007_seafarer_discoverable"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text(
        "ALTER TABLE companies ADD COLUMN IF NOT EXISTS "
        "company_status VARCHAR(20) NOT NULL DEFAULT 'pending'"
    ))
    op.execute(sa.text(
        "ALTER TABLE companies ADD COLUMN IF NOT EXISTS rejection_reason TEXT"
    ))
    op.execute(sa.text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
        "email_verified BOOLEAN NOT NULL DEFAULT FALSE"
    ))
    op.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS email_verification_tokens (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token VARCHAR(64) NOT NULL UNIQUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ
        )
    """))
    op.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS idx_evt_user ON email_verification_tokens(user_id)"
    ))


def downgrade() -> None:
    op.execute(sa.text("DROP TABLE IF EXISTS email_verification_tokens"))
    op.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS email_verified"))
    op.execute(sa.text("ALTER TABLE companies DROP COLUMN IF EXISTS rejection_reason"))
    op.execute(sa.text("ALTER TABLE companies DROP COLUMN IF EXISTS company_status"))
