"""T18 — the single Castor file-fetch helper (no network, no database)."""
import os

os.environ.setdefault("SECRET_KEY", "x" * 48)
os.environ.setdefault("DRIVE_STATE_SECRET", "y" * 48)

import logging
import urllib.error

import pytest
from jose import jwt

from app.core.config import settings
from app.services import castor_files
from app.services.castor_files import CastorFetchError, fetch_castor_file


class _Resp:
    headers = {"Content-Type": "application/pdf"}

    def read(self):
        return b"%PDF"

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def test_fetch_returns_bytes_and_type_and_sends_service_token(monkeypatch):
    seen = {}

    def fake_urlopen(req, timeout):
        seen["url"], seen["auth"], seen["timeout"] = req.full_url, req.get_header("Authorization"), timeout
        return _Resp()

    monkeypatch.setattr(castor_files.urllib.request, "urlopen", fake_urlopen)
    content, ctype = fetch_castor_file("u1", "a b.pdf", service="pollux-test-proxy", timeout=7)
    assert (content, ctype) == (b"%PDF", "application/pdf")
    assert seen["url"].endswith("/api/users/u1/myfiles/download/a%20b.pdf") and seen["timeout"] == 7
    claims = jwt.get_unverified_claims(seen["auth"].split()[1])
    assert claims["sub"] == "pollux-test-proxy" and claims["svc"] is True and "role" not in claims


def test_fetch_failure_is_generic_for_the_client_and_detailed_in_the_log(monkeypatch, caplog):
    def boom(req, timeout):
        raise urllib.error.HTTPError(req.full_url, 404, "nope", {}, None)

    monkeypatch.setattr(castor_files.urllib.request, "urlopen", boom)
    with caplog.at_level(logging.ERROR, logger="app.services.castor_files"):
        with pytest.raises(CastorFetchError) as err:
            fetch_castor_file("u1", "x.pdf", service="pollux-test-proxy")
    assert str(err.value) == castor_files.GENERIC_ERROR
    assert "u1" not in str(err.value) and settings.CASTOR_BASE_URL not in str(err.value)
    assert "status=404" in caplog.text and "Bearer" not in caplog.text
