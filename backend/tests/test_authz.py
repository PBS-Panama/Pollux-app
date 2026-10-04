"""AuthZ sweep (T14): walks every route of the real app and checks that, apart
from an explicit allow-list of intentionally public routes, a request with no
token gets 401 and /api/admin/* + company routes reject the wrong role with 403.
Adding a route without auth makes this fail — add it to PUBLIC only on purpose.

Run (needs pytest + httpx; no database: auth fails before any query):
    pytest tests/test_authz.py
"""
import os
import re

os.environ.setdefault("SECRET_KEY", "x" * 48)
os.environ.setdefault("DRIVE_STATE_SECRET", "y" * 48)

import pytest
from fastapi.testclient import TestClient

from app.core.deps import get_current_user
from app.main import app
from app.models.user import User

# (method, path) that are public ON PURPOSE. Everything else must demand a token.
PUBLIC = {
    ("GET", "/health"),
    ("GET", "/ready"),
    ("POST", "/api/auth/register"),
    ("POST", "/api/auth/login"),
    ("POST", "/api/auth/refresh"),
    ("GET", "/api/auth/verify-email"),
    ("POST", "/api/auth/forgot-password"),
    ("POST", "/api/auth/reset-password"),
    ("POST", "/api/admin/alerts"),        # frontend fallback telemetry, rate-limited + size-capped
    ("GET", "/api/drive/callback"),       # Google redirect; protected by the signed state
    # Read-only reference catalogs the landing/onboarding pages show before login.
    ("GET", "/api/compliance/catalog"),
    ("GET", "/api/compliance/catalog/{rank}"),
    ("GET", "/api/compliance/required-docs"),
    ("GET", "/api/exams/centers"),
    ("GET", "/api/exams/courses"),
    ("GET", "/api/learning/series"),
    ("GET", "/api/learning/series/{badge_id}"),
}

# Routes whose handler is not meant to be role-gated beyond "signed in"
# (any role may call them) are not checked for 403, only for 401.
COMPANY_PREFIX = "/api/company"


SCHEMA = app.openapi()  # public API: stable across FastAPI versions (app.routes is not)


def _routes():
    for path, ops in SCHEMA["paths"].items():
        for method in ops:
            yield method.upper(), path


_DUMMY = {"string": "x", "integer": 0, "number": 0.0, "boolean": False, "array": [], "object": {}}


def _resolve(schema: dict) -> dict:
    ref = schema.get("$ref")
    return SCHEMA["components"]["schemas"][ref.rsplit("/", 1)[-1]] if ref else schema


def _body(method: str, path: str) -> dict:
    """Minimal valid JSON body so body validation (422) can't mask the role
    check that runs inside the handler. Best-effort: required fields only."""
    content = SCHEMA["paths"][path][method.lower()].get("requestBody", {}).get("content", {})
    if "application/json" not in content:
        return {}
    model = _resolve(content["application/json"]["schema"])
    props = model.get("properties", {})
    return {
        n: "2026-01-01" if props[n].get("format") == "date" else _DUMMY.get(props[n].get("type"), "x")
        for n in model.get("required", [])
    }


def _url(path: str) -> str:
    return re.sub(r"\{[^}]+\}", "00000000-0000-0000-0000-000000000000", path)


def _as_role(role: str):
    user = User(id="u-test", email="t@example.com", role=role, is_active=True, company_id="c-test")
    app.dependency_overrides[get_current_user] = lambda: user


@pytest.fixture(autouse=True)
def _clean_overrides():
    yield
    app.dependency_overrides.clear()


client = TestClient(app, raise_server_exceptions=False)
PROTECTED = sorted(rt for rt in _routes() if rt not in PUBLIC and not rt[1].startswith(("/api/docs", "/api/redoc", "/api/openapi")))


@pytest.mark.parametrize("method,path", PROTECTED)
def test_returns_401_without_token(method, path):
    assert client.request(method, _url(path), json=_body(method, path)).status_code == 401


@pytest.mark.parametrize("role", ["seafarer", "company"])
@pytest.mark.parametrize("method,path", [rt for rt in PROTECTED if rt[1].startswith("/api/admin")])
def test_admin_routes_reject_non_admin(method, path, role):
    _as_role(role)
    assert client.request(method, _url(path), json=_body(method, path)).status_code == 403


@pytest.mark.parametrize("method,path", [rt for rt in PROTECTED if rt[1].startswith(COMPANY_PREFIX)])
def test_company_routes_reject_seafarer(method, path):
    _as_role("seafarer")
    assert client.request(method, _url(path), json=_body(method, path)).status_code == 403


def test_every_public_route_exists():
    assert PUBLIC - set(_routes()) == set(), "stale PUBLIC entry"
