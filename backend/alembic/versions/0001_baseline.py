"""Baseline — schema as it existed on 2026-08-28 (create_all + every startup ALTER/CREATE).

Revision ID: 0001_baseline
Revises:
Create Date: 2026-08-28

Why this shape
--------------
Until this revision the schema was built at every app start by
``Base.metadata.create_all()`` followed by ~30 ``ALTER TABLE … IF NOT EXISTS`` /
``CREATE TABLE IF NOT EXISTS`` statements in ``app/main.py`` (PM review, C4).
This migration reproduces exactly that, **idempotently**, so it is safe on:

* a fresh database   → creates everything, stamps 0001_baseline
* the existing prod DB (leto-postgres, shared with pb-leto) → every statement is a
  no-op because the objects already exist; only ``alembic_version`` is written.

From here on, schema changes are NEW revisions (``alembic revision -m "..."``),
never edits to this file, and the app no longer runs DDL at startup.

Data seeds (admin user, catalogs, demo accounts) are NOT migrations — they live
in ``app/db/seeds.py`` and run at startup, idempotently.

2026-09-13 exception to "never edit this file": this revision had NOT been applied
to the shared prod DB yet (confirmed — no ``alembic_version`` row existed), so
editing it in-place could not cause the divergence the "never edit" rule exists to
prevent. Two edits were made under that condition, both PM-reviewed: the
``seafarer_code`` prefix (``LT-`` → ``CS-``, prod had zero live codes) and the
``SUBSTRING(... FROM 8)`` → ``FROM 7`` off-by-one fix in ``seafarer_code.py`` (not in
this file, but same justification). Once this revision is applied anywhere with real
data, the "never edit" rule is back in force with no exceptions.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Every statement below is idempotent (IF NOT EXISTS / ON CONFLICT / NOT EXISTS guard).
_DDL: list[str] = [
    # ── users ───────────────────────────────────────────────────────────
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_b64 TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS seafarer_code VARCHAR(20)",
    "CREATE UNIQUE INDEX IF NOT EXISTS users_seafarer_code_uidx ON users (seafarer_code) WHERE seafarer_code IS NOT NULL",

    # ── documents (Sprint 2 verification · 6A storage metadata · Fase 0 · Obj.2) ──
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending'",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_verdict JSONB",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS verified_by VARCHAR(36)",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS registry_result JSONB",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_name VARCHAR(500)",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS saved_name VARCHAR(500)",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size INTEGER",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100)",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS category INTEGER",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS category_label VARCHAR(100)",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS validity_years INTEGER",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS issuing_country VARCHAR(2)",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS code_name VARCHAR(120)",

    # ── seafarers (profile enrichment · Interface Tripulante Fase 0 · Phase 2) ──
    "ALTER TABLE seafarers ADD COLUMN IF NOT EXISTS department VARCHAR(50)",
    "ALTER TABLE seafarers ADD COLUMN IF NOT EXISTS city VARCHAR(100)",
    "ALTER TABLE seafarers ADD COLUMN IF NOT EXISTS nationalities JSONB",
    "ALTER TABLE seafarers ADD COLUMN IF NOT EXISTS spoken_languages JSONB",
    "ALTER TABLE seafarers ADD COLUMN IF NOT EXISTS vessel_types JSONB",
    "ALTER TABLE seafarers ADD COLUMN IF NOT EXISTS residence_country VARCHAR(10)",
    "ALTER TABLE seafarers ADD COLUMN IF NOT EXISTS reference_airport VARCHAR(20)",
    "ALTER TABLE seafarers ADD COLUMN IF NOT EXISTS gender VARCHAR(20)",
    "ALTER TABLE seafarers ADD COLUMN IF NOT EXISTS residence_province VARCHAR(100)",
    "ALTER TABLE seafarers ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(200)",
    "ALTER TABLE seafarers ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(100)",
    "ALTER TABLE seafarers ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50)",

    # ── Sprint 6B — rank compliance catalog ─────────────────────────────
    """CREATE TABLE IF NOT EXISTS rank_compliance_catalog (
        id SERIAL PRIMARY KEY,
        rank VARCHAR(50) NOT NULL,
        fleet_cat VARCHAR(50) NOT NULL,
        doc_name VARCHAR(255) NOT NULL,
        cert VARCHAR(200),
        level VARCHAR(20) DEFAULT 'standard',
        cert_type VARCHAR(10) DEFAULT 'D/P',
        validity_years INTEGER,
        is_required BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT rcc_unique_rank_doc UNIQUE(rank, doc_name)
    )""",

    # ── Sprint 3B — Learning Record CMS ─────────────────────────────────
    """CREATE TABLE IF NOT EXISTS learning_series (
        id VARCHAR(36) PRIMARY KEY,
        badge_id VARCHAR(100) NOT NULL UNIQUE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        background_image TEXT,
        card_thumbnail TEXT,
        is_published BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )""",
    """CREATE TABLE IF NOT EXISTS learning_seasons (
        id VARCHAR(36) PRIMARY KEY,
        series_id VARCHAR(36) NOT NULL REFERENCES learning_series(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        "order" INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )""",
    """CREATE TABLE IF NOT EXISTS learning_episodes (
        id VARCHAR(36) PRIMARY KEY,
        season_id VARCHAR(36) NOT NULL REFERENCES learning_seasons(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        youtube_url TEXT,
        youtube_thumbnail TEXT,
        duration_seconds INTEGER,
        "order" INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )""",

    # ── Sprint 4B — company–seafarer relationships ──────────────────────
    """CREATE TABLE IF NOT EXISTS relationships (
        id VARCHAR(36) PRIMARY KEY,
        company_id VARCHAR(36) NOT NULL,
        seafarer_id VARCHAR(36) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )""",

    # ── Sprint 5C — platform settings ───────────────────────────────────
    """CREATE TABLE IF NOT EXISTS platform_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )""",

    # ── Sprint 5B — exam courses & training centers ─────────────────────
    """CREATE TABLE IF NOT EXISTS exam_courses (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        code VARCHAR(50),
        stcw_ref VARCHAR(100),
        level VARCHAR(50),
        departments JSONB DEFAULT '[]',
        description TEXT,
        duration VARCHAR(100),
        validity VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )""",
    """CREATE TABLE IF NOT EXISTS training_centers (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        abbreviation VARCHAR(50),
        city VARCHAR(100),
        district VARCHAR(100),
        type VARCHAR(100),
        resolution VARCHAR(100),
        website VARCHAR(200),
        courses_count INTEGER,
        specialties JSONB DEFAULT '[]',
        notes TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )""",

    # ── seafarer learning progress ──────────────────────────────────────
    """CREATE TABLE IF NOT EXISTS seafarer_learning_progress (
        id                      VARCHAR       PRIMARY KEY,
        seafarer_id             VARCHAR       NOT NULL REFERENCES seafarers(id) ON DELETE CASCADE,
        series_id               VARCHAR       NOT NULL REFERENCES learning_series(id) ON DELETE CASCADE,
        status                  VARCHAR(20)   NOT NULL DEFAULT 'enrolled',
        enrolled_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        completed_at            TIMESTAMPTZ,
        last_watched_episode_id VARCHAR       REFERENCES learning_episodes(id) ON DELETE SET NULL,
        progress_pct            INTEGER       NOT NULL DEFAULT 0,
        CONSTRAINT uq_sf_series UNIQUE (seafarer_id, series_id),
        CONSTRAINT chk_sf_status CHECK (status IN ('enrolled', 'in_progress', 'completed'))
    )""",
    "CREATE INDEX IF NOT EXISTS idx_slp_seafarer ON seafarer_learning_progress(seafarer_id)",
    "CREATE INDEX IF NOT EXISTS idx_slp_series   ON seafarer_learning_progress(series_id)",

    # ── OCR feedback loop ───────────────────────────────────────────────
    """CREATE TABLE IF NOT EXISTS ocr_feedback_log (
        id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id   UUID         NOT NULL,
        doc_key       VARCHAR(300),
        doc_name      VARCHAR(500),
        ai_status     VARCHAR(50),
        ai_confidence REAL,
        ai_flags      JSONB        DEFAULT '[]',
        ai_identified_as VARCHAR(300),
        human_decision   VARCHAR(20) NOT NULL,
        rejection_reason TEXT,
        ai_correct    BOOLEAN,
        admin_id      VARCHAR(36),
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )""",
    "CREATE INDEX IF NOT EXISTS idx_ocr_fb_doc_key ON ocr_feedback_log(doc_key)",
    "CREATE INDEX IF NOT EXISTS idx_ocr_fb_created ON ocr_feedback_log(created_at DESC)",

    # ── Obj.1 — admin alerts ────────────────────────────────────────────
    """CREATE TABLE IF NOT EXISTS admin_alerts (
        id          VARCHAR(36)  PRIMARY KEY,
        level       VARCHAR(20)  NOT NULL DEFAULT 'warn',
        source      VARCHAR(100) NOT NULL,
        message     TEXT         NOT NULL,
        context     JSONB,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )""",
    "CREATE INDEX IF NOT EXISTS idx_admin_alerts_created ON admin_alerts(created_at DESC)",

    # ── Obj.3 — doc type rules (admin-managed OCR classification) ───────
    """CREATE TABLE IF NOT EXISTS doc_type_rules (
        doc_key              VARCHAR(300) PRIMARY KEY,
        expected_keywords    JSONB        NOT NULL DEFAULT '[]',
        red_flag_keywords    JSONB        NOT NULL DEFAULT '[]',
        min_confidence       REAL         NOT NULL DEFAULT 0.5,
        auto_verify_threshold REAL        NOT NULL DEFAULT 0.9,
        number_regex         VARCHAR(200),
        notes                TEXT,
        updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )""",

    # ── Obj.4 — Google Drive tokens ─────────────────────────────────────
    """CREATE TABLE IF NOT EXISTS drive_tokens (
        user_id       VARCHAR(36) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        encrypted_rt  TEXT        NOT NULL,
        google_email  VARCHAR(200),
        scope         TEXT,
        connected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_sync_at  TIMESTAMPTZ
    )""",
]

# Data backfill that used to run at startup (Fase 0 — seafarer_code epic).
# Idempotent: only touches rows where seafarer_code IS NULL and never collides.
# Prefix is CS- (Castor), not LT- — changed 2026-09-13, Rick's call ahead of the
# shared prod migration (codes are user-facing; Castor is the brand). Prod had
# zero live seafarer_code rows at the time of the switch, so there was nothing
# to reconcile — see generate_seafarer_code() for the same prefix, used going
# forward for new registrations outside this one-time backfill.
_BACKFILL_SEAFARER_CODE = """
WITH ranked AS (
    SELECT u.id,
           UPPER(COALESCE(LEFT(s.nationality, 2), 'XX')) AS country,
           ROW_NUMBER() OVER (
               PARTITION BY UPPER(COALESCE(LEFT(s.nationality, 2), 'XX'))
               ORDER BY u.created_at
           ) AS rn
    FROM users u
    LEFT JOIN seafarers s ON s.id = u.id
    WHERE u.role = 'seafarer' AND u.seafarer_code IS NULL
)
UPDATE users u
SET seafarer_code = 'CS-' || r.country || '-' || LPAD(r.rn::text, 4, '0')
FROM ranked r
WHERE u.id = r.id
AND NOT EXISTS (
    SELECT 1 FROM users u2
    WHERE u2.seafarer_code = 'CS-' || r.country || '-' || LPAD(r.rn::text, 4, '0')
)
"""


def upgrade() -> None:
    bind = op.get_bind()

    # 1. Model-declared tables (users, seafarers, companies, documents, …).
    #    checkfirst=True → no-op for tables that already exist.
    from app.db.base import Base
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=bind, checkfirst=True)

    # 2. Enum value — must run outside the migration transaction on Postgres.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'admin'")

    # 3. Everything that main.py used to ALTER/CREATE at startup.
    for stmt in _DDL:
        op.execute(sa.text(stmt))

    # 4. One-time data backfill (safe to re-run).
    op.execute(sa.text(_BACKFILL_SEAFARER_CODE))


def downgrade() -> None:
    # Baseline of a live, shared database: there is nothing safe to "undo".
    raise RuntimeError("0001_baseline cannot be downgraded — restore from a Cloud SQL backup instead.")
