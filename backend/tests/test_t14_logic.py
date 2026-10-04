"""T14 hardening — behaviour of the small pure pieces (no database needed)."""
import os
import time

os.environ.setdefault("SECRET_KEY", "x" * 48)
os.environ.setdefault("DRIVE_STATE_SECRET", "y" * 48)

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError
from starlette.requests import Request

from app.core.rate_limit import get_real_ip
from app.main import app
from app.routers import drive
from app.routers.admin import AlertCreate
from app.routers.drive import ImportPayload, _make_state, _verify_state
from app.routers.users import _AVATAR_RE


def _req(xff):
    return Request({"type": "http", "headers": [(b"x-forwarded-for", xff.encode())], "client": ("9.9.9.9", 1)})


def test_rate_limit_uses_last_forwarded_ip_not_spoofable_first():
    assert get_real_ip(_req("6.6.6.6, 1.2.3.4")) == "1.2.3.4"


def test_drive_state_roundtrip_and_tamper():
    s = _make_state("user-1")
    assert _verify_state(s) == "user-1"
    forged = s.replace("user-1", "user-2", 1)
    with pytest.raises(HTTPException):
        _verify_state(forged)


def test_drive_state_expires(monkeypatch):
    s = _make_state("user-1")
    real = time.time
    monkeypatch.setattr(drive.time, "time", lambda: real() + drive.STATE_TTL_SECONDS + 1)
    with pytest.raises(HTTPException):
        _verify_state(s)


@pytest.mark.parametrize("uri,ok", [
    ("data:image/png;base64,iVBORw0KGgo=", True),
    ("data:image/webp;base64,AAAA", True),
    ("data:image/svg+xml;base64,PHN2Zz4=", False),
    ("data:image/png;base64,<script>", False),
])
def test_avatar_accepts_only_raster_base64(uri, ok):
    assert bool(_AVATAR_RE.fullmatch(uri)) is ok


def test_import_payload_strips_header_injection():
    p = ImportPayload(file_id="f", file_name='a"\r\nX-Evil: 1.pdf', doc_name="d\nx")
    assert not any(c in p.file_name + p.doc_name for c in '\r\n"')


def test_alert_caps():
    with pytest.raises(ValidationError):
        AlertCreate(source="s", message="m" * 2001)
    with pytest.raises(ValidationError):
        AlertCreate(source="s", message="m", context={"k": "v" * 5000})


def test_register_rejects_short_password():
    r = TestClient(app, raise_server_exceptions=False).post(
        "/api/auth/register", json={"email": "a@b.co", "password": "short", "role": "seafarer"})
    assert r.status_code == 422


def test_docs_off_in_production():
    from app.core.config import settings
    assert (settings.is_production) == (app.docs_url is None)
