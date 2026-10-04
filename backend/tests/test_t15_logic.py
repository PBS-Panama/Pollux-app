"""T15 robustness — readiness, admin seed, production email gate (no Postgres needed)."""
import os
from contextlib import contextmanager

os.environ.setdefault("SECRET_KEY", "x" * 48)
os.environ.setdefault("DRIVE_STATE_SECRET", "y" * 48)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app import main
from app.core.config import Settings, settings
from app.db import seeds

PROD = dict(
    ENVIRONMENT="production", SECRET_KEY="k" * 48, CORS_ORIGINS="https://pollux-app.com",
    DATABASE_URL="postgresql://u:p@db.example:5432/d", CASTOR_BASE_URL="https://castor.example",
    FRONTEND_URL="https://pollux-app.com", EMAIL_PROVIDER="gmail_api",
)


def test_production_refuses_logger_email_provider():
    Settings(**PROD)  # sanity: the rest of the config is valid
    with pytest.raises(RuntimeError, match="EMAIL_PROVIDER"):
        Settings(**{**PROD, "EMAIL_PROVIDER": "logger"})


class _FakeEngine:
    def __init__(self, fail=False):
        self.fail = fail

    @contextmanager
    def connect(self):
        if self.fail:
            raise RuntimeError("db down")
        yield type("C", (), {"execute": lambda self, *_: None})()


def _ready(monkeypatch, engine, schema):
    monkeypatch.setattr(main, "engine", engine)
    monkeypatch.setattr(main, "schema_status", lambda _e: schema)
    return TestClient(main.app).get("/ready")


def test_ready_ok_when_db_answers_and_schema_is_head(monkeypatch):
    assert _ready(monkeypatch, _FakeEngine(), ("0013", "0013", True)).status_code == 200


def test_ready_503_when_db_is_down(monkeypatch):
    assert _ready(monkeypatch, _FakeEngine(fail=True), ("0013", "0013", True)).status_code == 503


def test_ready_503_on_schema_mismatch_and_hides_revisions(monkeypatch):
    r = _ready(monkeypatch, _FakeEngine(), ("0009", "0013", False))
    assert r.status_code == 503 and "0009" not in r.text


def test_health_never_touches_the_db(monkeypatch):
    monkeypatch.setattr(main, "engine", _FakeEngine(fail=True))
    assert TestClient(main.app).get("/health").status_code == 200


@pytest.fixture
def users_db():
    eng = create_engine("sqlite://")
    with eng.begin() as c:
        c.execute(text("CREATE TABLE users (id TEXT, email TEXT, hashed_password TEXT, role TEXT, "
                       "is_active BOOL, email_verified BOOL, created_at TEXT, updated_at TEXT)"))
    return eng


def _hash(eng):
    with eng.connect() as c:
        return c.execute(text("SELECT hashed_password FROM users")).scalar()


def test_seed_admin_creates_when_missing_but_never_overwrites_without_flag(users_db, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_SEED_EMAIL", "admin@example.com")
    monkeypatch.setattr(settings, "ADMIN_SEED_PASSWORD", "first-password-1")
    monkeypatch.setattr(settings, "ADMIN_SEED_RESET", False)
    seeds.seed_admin(users_db)
    created = _hash(users_db)
    assert created
    monkeypatch.setattr(settings, "ADMIN_SEED_PASSWORD", "second-password-2")
    seeds.seed_admin(users_db)
    assert _hash(users_db) == created


def test_seed_admin_resets_only_behind_explicit_flag(users_db, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_SEED_EMAIL", "admin@example.com")
    monkeypatch.setattr(settings, "ADMIN_SEED_PASSWORD", "first-password-1")
    monkeypatch.setattr(settings, "ADMIN_SEED_RESET", False)
    seeds.seed_admin(users_db)
    before = _hash(users_db)
    monkeypatch.setattr(settings, "ADMIN_SEED_PASSWORD", "second-password-2")
    monkeypatch.setattr(settings, "ADMIN_SEED_RESET", True)
    seeds.seed_admin(users_db)
    assert _hash(users_db) != before
