#!/usr/bin/env python
# ─────────────────────────────────────────────────────────────────────────────
# Secrets panel (T9/T10) — end-to-end regression against a REAL running
# backend + REAL Postgres. T13 (2026-10-03) update: SECRET_KEY and
# DRIVE_TOKEN_SECRET rotation is now DISABLED here (shared with Castor,
# which hasn't implemented the double-key window / Secret Manager reads
# yet — see secret_loader.ROTATION_DISABLED). This test now proves (a) that
# block actually rejects rotate/rollback with a clear reason, and (b)
# DRIVE_STATE_SECRET — the one still rotatable — genuinely rotates and
# rolls back, including the double-key fallback for an in-flight OAuth
# state signed just before a rotation.
#
# Needs the local stack up (docker compose up -d --build) and
# ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD set in .env, same as the rest of
# local dev. Run from inside the backend container, where localhost:8000 is
# FastAPI directly (no nginx in front):
#
#   docker compose exec backend python test_secret_rotation.py
#
# Exits with code 1 if anything fails. Same pattern as test_compliance_engine.py
# and test_ocr_mock_guard.py — no pytest, just check(label, cond).
# ─────────────────────────────────────────────────────────────────────────────
import json
import os
import sys
import urllib.error
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.services.secret_loader import get_secret, get_secret_previous, invalidate as invalidate_secret_cache
from app.routers.drive import _make_state, _verify_state

BASE = "http://localhost:8000/api"
ADMIN_EMAIL = os.environ["ADMIN_SEED_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_SEED_PASSWORD"]

fail = 0


def check(label, cond):
    global fail
    ok = bool(cond)
    if not ok:
        fail += 1
    print(f"  {'✓' if ok else '✗'} {label}")
    return ok


def call(method, path, token=None, body=None):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, raw, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        return e.code, raw, (json.loads(raw) if raw else None)


def login():
    status, _, payload = call("POST", "/auth/login", body={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert status == 200, f"login failed: {status}"
    return payload["access_token"]


token = login()

print("=== 1) GET /admin/secrets reports rotation_disabled correctly ===")
status, raw_list, listing = call("GET", "/admin/secrets", token=token)
check("list succeeds", status == 200)
by_name = {s["name"]: s for s in listing}
check("SECRET_KEY: rotation_disabled=true", by_name["SECRET_KEY"]["rotation_disabled"] is True)
check("SECRET_KEY: reason mentions Castor", "Castor" in (by_name["SECRET_KEY"]["rotation_disabled_reason"] or ""))
check("DRIVE_TOKEN_SECRET: rotation_disabled=true", by_name["DRIVE_TOKEN_SECRET"]["rotation_disabled"] is True)
check("DRIVE_TOKEN_SECRET: reason mentions Castor", "Castor" in (by_name["DRIVE_TOKEN_SECRET"]["rotation_disabled_reason"] or ""))
check("DRIVE_STATE_SECRET: rotation_disabled=false (still rotatable)", by_name["DRIVE_STATE_SECRET"]["rotation_disabled"] is False)
check("DRIVE_STATE_SECRET: no reason attached", by_name["DRIVE_STATE_SECRET"]["rotation_disabled_reason"] is None)
check("GOOGLE_DRIVE_CLIENT_SECRET is NOT in this panel anymore (moved to api_key_config, T13)", "GOOGLE_DRIVE_CLIENT_SECRET" not in by_name)

print("\n=== 2) SECRET_KEY rotate/rollback are blocked (403), not silently skipped ===")
status, raw, resp = call("POST", "/admin/secrets/SECRET_KEY/rotate", token=token, body={"current_password": ADMIN_PASSWORD})
check("rotate SECRET_KEY -> 403", status == 403)
check("403 detail mentions Castor", "Castor" in (resp or {}).get("detail", ""))
status, raw, resp = call("POST", "/admin/secrets/SECRET_KEY/rollback", token=token, body={"current_password": ADMIN_PASSWORD})
check("rollback SECRET_KEY -> 403", status == 403)

print("\n=== 3) DRIVE_TOKEN_SECRET rotate/rollback are blocked (403) too ===")
status, raw, resp = call("POST", "/admin/secrets/DRIVE_TOKEN_SECRET/rotate", token=token, body={"current_password": ADMIN_PASSWORD})
check("rotate DRIVE_TOKEN_SECRET -> 403", status == 403)
status, raw, resp = call("POST", "/admin/secrets/DRIVE_TOKEN_SECRET/rollback", token=token, body={"current_password": ADMIN_PASSWORD})
check("rollback DRIVE_TOKEN_SECRET -> 403", status == 403)

print("\n=== 4) DRIVE_STATE_SECRET — still fully rotatable, double-key fallback works ===")
state_secret_before = get_secret("DRIVE_STATE_SECRET")
state_before_rotation = _make_state("probe-user-id-t13")
check("sanity: freshly-made state verifies BEFORE any rotation", _verify_state(state_before_rotation) == "probe-user-id-t13")

status, raw, rotate_resp = call("POST", "/admin/secrets/DRIVE_STATE_SECRET/rotate", token=token, body={"current_password": ADMIN_PASSWORD})
check("rotate DRIVE_STATE_SECRET succeeds", status == 200)
invalidate_secret_cache("DRIVE_STATE_SECRET")
state_secret_after = get_secret("DRIVE_STATE_SECRET")
check("the value actually changed", state_secret_after != state_secret_before)
check("rotate response does not contain the OLD value", state_secret_before not in raw)
check("rotate response does not contain the NEW value", state_secret_after not in raw)

check(
    "a state signed BEFORE rotation still verifies AFTER (double-key fallback, routers/drive.py)",
    _verify_state(state_before_rotation) == "probe-user-id-t13",
)
state_after_rotation = _make_state("probe-user-id-t13-2")
check("a FRESH state made after rotation also verifies (new key signs correctly)", _verify_state(state_after_rotation) == "probe-user-id-t13-2")

status, raw, _ = call("POST", "/admin/secrets/DRIVE_STATE_SECRET/rollback", token=token, body={"current_password": ADMIN_PASSWORD})
check("rollback DRIVE_STATE_SECRET succeeds", status == 200)
invalidate_secret_cache("DRIVE_STATE_SECRET")
restored = get_secret("DRIVE_STATE_SECRET")
check("after rollback, the value is back to the original", restored == state_secret_before)
check("rollback response does not contain any real value", state_secret_before not in raw and state_secret_after not in raw)

print("\n=== 5) No secret value ever appears in panel list/audit responses ===")
status, raw_list2, _ = call("GET", "/admin/secrets", token=token)
for label, value in (
    ("DRIVE_STATE_SECRET (before)", state_secret_before),
    ("DRIVE_STATE_SECRET (after rotation, now rolled back)", state_secret_after),
):
    check(f"GET /admin/secrets never contains {label}", value not in raw_list2)

print(f"\n{'=' * 60}")
if fail:
    print(f"FAILED: {fail} check(s) failed")
    sys.exit(1)
print("All checks passed.")
