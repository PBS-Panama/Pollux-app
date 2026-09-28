"""Fix polar-water learning content mislabeled as STCW V/3 — it is V/4.

Revision ID: 0010_polar_v4_title_fix
Revises: 0009_api_key_config
Create Date: 2026-09-14

Why
---
The polar-waters learning series (badge_id "stcw-reg-v3") titles its content
under STCW Reg. V/3 in three places. That is wrong on two counts: (1) polar
water training is Reg. V/4 ("training and qualifications of masters and deck
officers on ships operating in polar waters", MSC.416(97), in force since
2018-07-01 — see claude/POLAR_V4_ESPECIFICACION.md for the full reg text,
read from the IMO's own CDN, not the ITF guide previously attached to the
project, which turned out to be a secondary summary with an internal
contradiction on PSCRB/FRB revalidation); (2) V/3 is a real, unrelated rule
— the IGF Code (gas/low-flashpoint fuel ships), added by MSC.396(95) in 2015.
The episode-level content already cites the right competence codes (A-V/4-1,
A-V/4-2) — only the three season/series/episode TITLE strings have the wrong
rule number in their header.

Why a migration, not a seeds.py fix alone
------------------------------------------
`app/db/seeds.py` seeds `learning_series`/`seasons`/`episodes` only once,
gated on `SELECT COUNT(*) FROM learning_series` being 0 (see run_seeds()).
Production already has these rows — the seeds.py fix (same commit, same
titles corrected) only prevents the wrong text on a *fresh* database; it does
nothing to the row that is already live. And unlike doc_type_rules pre-L-5,
these ARE admin-editable today (routers/learning.py's PATCH endpoints for
series/seasons/episodes) — so this does not blanket-overwrite on every
restart (it is a one-time migration, not a seed step) and each UPDATE is
scoped to the exact wrong string, not "always set to X": if an admin already
edited one of these three titles to something else, the WHERE clause simply
won't match and their edit is left alone. Symmetric downgrade.

Not touched: `badge_id: "stcw-reg-v3"` on the series — an identifier the
migration's own scope wasn't asked to touch (title text only), used nowhere
else in the codebase today, but changing a seeded row's identity has its own
risk category and wasn't part of what was requested. Flagged in Handover.md
for whoever picks it up.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0010_polar_v4_title_fix"
down_revision: Union[str, None] = "0009_api_key_config"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FIXES = [
    ("learning_episodes", "Reg. V/1-1, V/1-2, V/2, V/3", "Reg. V/1-1, V/1-2, V/2, V/3, V/4"),
    ("learning_seasons", "T5 — Aguas Polares (V/3)", "T5 — Aguas Polares (V/4)"),
    ("learning_series", "STCW Reg. V/3 — Aguas Polares (Polar Code)", "STCW Reg. V/4 — Aguas Polares (Polar Code)"),
]


def upgrade() -> None:
    conn = op.get_bind()
    for table, old, new in _FIXES:
        conn.execute(
            sa.text(f"UPDATE {table} SET title = :new WHERE title = :old"),
            {"new": new, "old": old},
        )


def downgrade() -> None:
    conn = op.get_bind()
    for table, old, new in _FIXES:
        conn.execute(
            sa.text(f"UPDATE {table} SET title = :old WHERE title = :new"),
            {"new": new, "old": old},
        )
