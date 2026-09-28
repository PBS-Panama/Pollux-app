"""Programmatic Alembic helpers used by the app at startup.

Schema ownership rules (PM review C4, 2026-08-28):
  * Schema changes live ONLY in backend/alembic/versions/.
  * The app never runs DDL by itself. At startup it may run `alembic upgrade head`
    when AUTO_MIGRATE=true (docker-compose dev convenience). In production the
    migration is a deploy step (Cloud Run Job / one-off container), and the app
    only verifies it is running against the expected schema version.
"""
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy.engine import Engine

_BACKEND_DIR = Path(__file__).resolve().parents[2]  # backend/
_INI = _BACKEND_DIR / "alembic.ini"


def alembic_config() -> Config:
    cfg = Config(str(_INI))
    cfg.set_main_option("script_location", str(_BACKEND_DIR / "alembic"))
    return cfg


def head_revision() -> str | None:
    return ScriptDirectory.from_config(alembic_config()).get_current_head()


def current_revision(engine: Engine) -> str | None:
    with engine.connect() as conn:
        return MigrationContext.configure(conn).get_current_revision()


def upgrade_to_head() -> None:
    command.upgrade(alembic_config(), "head")


def schema_status(engine: Engine) -> tuple[str | None, str | None, bool]:
    """Returns (current, head, is_current)."""
    cur = current_revision(engine)
    head = head_revision()
    return cur, head, (cur is not None and cur == head)
