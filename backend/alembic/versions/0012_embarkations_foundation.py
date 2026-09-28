"""Embarkation verification foundation — five new tables (E-1).

Revision ID: 0012_embarkations_foundation
Revises: 0011_password_reset
Create Date: 2026-09-15

Why
---
The full state machine, table columns, and notification matrix are specified
in docs/specs/EMBARQUES_MODELO_VERIFICACION.md (Handover.md notas 63/66).
This migration only creates the schema; app/services/embarkation_service.py
(the state machine + the three hard rules — the conjunction required for
no_verificable, attempts derived from embarkation_contact_log with a cap of
10, and reopening never resetting that count) and
app/services/notification_dispatch.py (per-(kind, recipient_scope) text) are
what actually enforce the model — this file has zero business logic on
purpose, same convention as every migration in this repo (0007-0011).

embarkations.contact_consent / contact_consent_at carry forward the
per-embarkation consent decision from 2026-09-14 (that day's Handover, nota
29), referenced again in the new spec's §6 ("el consentimiento por embarque
ya estaba decidido: va en columnas, no solo en la UI").

Tested locally against the hand-built schema this same migration mirrors
(backend/_manual_schema_e1.sql) via app/services/embarkation_service.py's
manual test suite (backend/_test_embarkation_service.py) — 28/28 checks
pass, including both hard rules (a: the deadline+attempts conjunction; b/c:
derived, capped, never-reset attempts) and the notification audience-leak
test (an 'observado' notification to recipient_scope='company' does not
contain the finding text a 'seafarer'/'admin' notification does).

NOT run against production — per the deploy gate, this migration is created
and reviewed here but does not get applied to leto-postgres without Rick's
explicit authorization (same procedure as 0009/0010/0011).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0012_embarkations_foundation"
down_revision: Union[str, None] = "0011_password_reset"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS embarkations (
            id VARCHAR(36) PRIMARY KEY,
            seafarer_id VARCHAR(36) NOT NULL REFERENCES seafarers(id) ON DELETE CASCADE,

            declared_vessel_name VARCHAR(200) NOT NULL,
            declared_vessel_imo VARCHAR(20),
            declared_company_name VARCHAR(200) NOT NULL,
            declared_rank VARCHAR(100) NOT NULL,
            declared_date_from DATE NOT NULL,
            declared_date_to DATE,

            verified_vessel_name VARCHAR(200),
            verified_vessel_imo VARCHAR(20),
            verified_company_name VARCHAR(200),
            verified_rank VARCHAR(100),
            verified_date_from DATE,
            verified_date_to DATE,

            verification_status VARCHAR(20) NOT NULL DEFAULT 'declarado',
            status_reason TEXT,
            has_correction BOOLEAN NOT NULL DEFAULT FALSE,

            verification_opened_at TIMESTAMPTZ,
            verification_deadline_at TIMESTAMPTZ,
            verification_attempts INTEGER NOT NULL DEFAULT 0,

            verified_by VARCHAR(36),
            verified_at TIMESTAMPTZ,
            reverted_by VARCHAR(36),
            reverted_at TIMESTAMPTZ,

            contact_consent BOOLEAN NOT NULL DEFAULT FALSE,
            contact_consent_at TIMESTAMPTZ,

            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_embarkations_seafarer ON embarkations(seafarer_id)"))

    op.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS embarkation_contact_log (
            id VARCHAR(36) PRIMARY KEY,
            embarkation_id VARCHAR(36) NOT NULL REFERENCES embarkations(id) ON DELETE CASCADE,
            attempt_no INTEGER NOT NULL,
            contacted_at TIMESTAMPTZ NOT NULL,
            channel VARCHAR(20) NOT NULL,
            phone_number_called VARCHAR(50),
            respondent_name VARCHAR(200),
            respondent_position VARCHAR(200),
            email_contacted VARCHAR(320),
            attachment_ref VARCHAR(500),
            comments TEXT,
            actor_user_id VARCHAR(36) NOT NULL REFERENCES users(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_ecl_embarkation ON embarkation_contact_log(embarkation_id)"))

    op.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS embarkation_verification_events (
            id VARCHAR(36) PRIMARY KEY,
            embarkation_id VARCHAR(36) NOT NULL REFERENCES embarkations(id) ON DELETE CASCADE,
            from_status VARCHAR(20),
            to_status VARCHAR(20) NOT NULL,
            reason TEXT,
            actor_user_id VARCHAR(36) NOT NULL REFERENCES users(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_eve_embarkation ON embarkation_verification_events(embarkation_id)"))

    op.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS embarkation_remarks (
            id VARCHAR(36) PRIMARY KEY,
            subject_type VARCHAR(20) NOT NULL,
            subject_id VARCHAR(36) NOT NULL,
            field VARCHAR(100) NOT NULL,
            finding TEXT NOT NULL,
            created_by VARCHAR(36) NOT NULL REFERENCES users(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            appeal_text TEXT,
            appealed_at TIMESTAMPTZ,
            resolution VARCHAR(30),
            resolved_by VARCHAR(36),
            resolved_at TIMESTAMPTZ
        )
    """))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_remarks_subject ON embarkation_remarks(subject_type, subject_id)"))

    op.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS notifications (
            id VARCHAR(36) PRIMARY KEY,
            recipient_user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            recipient_scope VARCHAR(20) NOT NULL,
            company_id VARCHAR(36),
            kind VARCHAR(50) NOT NULL,
            subject_type VARCHAR(20) NOT NULL,
            subject_id VARCHAR(36) NOT NULL,
            title VARCHAR(300) NOT NULL,
            body TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            read_at TIMESTAMPTZ,
            requires_ack BOOLEAN NOT NULL DEFAULT FALSE,
            acknowledged_at TIMESTAMPTZ,
            acknowledged_by VARCHAR(36)
        )
    """))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id)"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_notifications_kind ON notifications(kind)"))


def downgrade() -> None:
    op.execute(sa.text("DROP TABLE IF EXISTS notifications"))
    op.execute(sa.text("DROP TABLE IF EXISTS embarkation_remarks"))
    op.execute(sa.text("DROP TABLE IF EXISTS embarkation_verification_events"))
    op.execute(sa.text("DROP TABLE IF EXISTS embarkation_contact_log"))
    op.execute(sa.text("DROP TABLE IF EXISTS embarkations"))
