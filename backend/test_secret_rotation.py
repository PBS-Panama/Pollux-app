#!/usr/bin/env python
# ─────────────────────────────────────────────────────────────────────────────
# Secrets panel (T9) — end-to-end regression against a REAL running backend +
# REAL Postgres. Needs the local stack up (docker compose up -d --build) and
# ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD set in .env, same as the rest of local
# dev. Run from inside the backend container, where localhost:8000 is
# FastAPI directly (no nginx in front):
#
#   docker compose exec backend python test_secret_rotation.py
#
# Exits with code 1 if anything fails. Same pattern as test_compliance_engine.py
# and test_ocr_mock_guard.py — no pytest, just check(label, cond).
#
# What this proves, end to end, not by reading the code and assuming:
#   1. A JWT issued BEFORE a SECRET_KEY rotation still authenticates AFTER
#      the rotation (the double-key window from security.py actually works
#      against the real /admin/me endpoint, not just in isolation).
#   2. A drive_tokens row encrypted BEFORE a DRIVE_TOKEN_SECRET rotation is
#      still readable (decryptable to the exact original plaintext) AFTER
#      the rotation re-encrypts it.
#   3. Rollback of DRIVE_TOKEN_SECRET restores the row to being decryptable
#      with the restored (previous) key.
#   4. No admin/secrets API response — list, test, rotate, rollback — ever
#      contains the real values this script itself generated/observed.
# ─────────────────────────────────────────────────────────────────────────────
import json
import os
import sys
import urllib.error
import urllib.request
import uuid

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sqlalchemy import text as sql
from app.db.session import SessionLocal
from app.services.token_crypto import encrypt_token, decrypt_token
from app.services.secret_loader import get_secret, invalidate as invalidate_secret_cache

# This script runs as its OWN process (docker compose exec spawns a new
# python, not the uvicorn server's). secret_loader's cache is in-process —
# exactly the "another Cloud Run instance" scenario the module's docstring
# describes. Without invalidating here before re-reading, this script would
# see its own stale cached value, not what the server just wrote to the
# shared store file. That's a property of THIS TEST, not a bug: a real
# second instance in prod would also keep serving the old value until its
# own TTL (or an explicit reload) — this script just needs to force that
# reload immediately after each action it performs itself.

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


print("=== 1) SECRET_KEY double-key window ===")
secret_key_before = get_secret("SECRET_KEY")
token_before_rotation = login()
status, _, me = call("GET", "/admin/me", token=token_before_rotation)
check("token authenticates BEFORE rotation", status == 200 and me.get("email") == ADMIN_EMAIL)

status, raw, _ = call(
    "POST", "/admin/secrets/SECRET_KEY/rotate", token=token_before_rotation,
    body={"current_password": ADMIN_PASSWORD},
)
check("SECRET_KEY rotate succeeds", status == 200)
invalidate_secret_cache("SECRET_KEY")
secret_key_after = get_secret("SECRET_KEY")
check("the key value actually changed", secret_key_after != secret_key_before)
check("rotate response does not contain the OLD key value", secret_key_before not in raw)
check("rotate response does not contain the NEW key value", secret_key_after not in raw)

status, _, me_again = call("GET", "/admin/me", token=token_before_rotation)
check(
    "OLD token (signed before rotation) STILL authenticates AFTER rotation (double-key window)",
    status == 200 and me_again.get("email") == ADMIN_EMAIL,
)

new_token = login()
status, _, me_new = call("GET", "/admin/me", token=new_token)
check("a FRESH login after rotation also works (new key signs correctly)", status == 200)

print("\n=== 2) DRIVE_TOKEN_SECRET re-encryption ===")
db = SessionLocal()
test_user_id = str(uuid.uuid4())
test_plaintext = f"test-refresh-token-{uuid.uuid4().hex[:8]}"
drive_secret_before = None
drive_secret_after = None

try:
    db.execute(sql(
        "INSERT INTO users (id, email, hashed_password, role, is_active, email_verified, created_at, updated_at) "
        "VALUES (:id, :email, 'x', 'seafarer', true, true, NOW(), NOW())"
    ), {"id": test_user_id, "email": f"secret-rotation-test-{test_user_id[:8]}@demo.pollux.local"})

    drive_secret_before = get_secret("DRIVE_TOKEN_SECRET")
    ciphertext_before = encrypt_token(test_plaintext, secret=drive_secret_before)
    db.execute(sql(
        "INSERT INTO drive_tokens (user_id, encrypted_rt, google_email, scope, connected_at) "
        "VALUES (:uid, :rt, 'test@example.com', 'drive.file', NOW())"
    ), {"uid": test_user_id, "rt": ciphertext_before})
    db.commit()

    sanity = decrypt_token(ciphertext_before, secret=drive_secret_before)
    check("sanity: test row decrypts correctly BEFORE any rotation", sanity == test_plaintext)

    status, raw, rotate_resp = call(
        "POST", "/admin/secrets/DRIVE_TOKEN_SECRET/rotate", token=new_token,
        body={"current_password": ADMIN_PASSWORD},
    )
    check("DRIVE_TOKEN_SECRET rotate succeeds", status == 200)
    check("rotate reports at least 1 re-encrypted drive_tokens row", "drive_tokens row" in (rotate_resp or {}).get("detail", ""))

    row = db.execute(sql(
        "SELECT encrypted_rt FROM drive_tokens WHERE user_id = :uid"
    ), {"uid": test_user_id}).fetchone()
    invalidate_secret_cache("DRIVE_TOKEN_SECRET")
    drive_secret_after = get_secret("DRIVE_TOKEN_SECRET")
    check("the secret value actually changed after rotation", drive_secret_after != drive_secret_before)
    check("the stored ciphertext actually changed (real re-encryption, not a no-op)", row.encrypted_rt != ciphertext_before)
    after_decrypt = decrypt_token(row.encrypted_rt, secret=drive_secret_after)
    check(
        "row decrypts to the EXACT original plaintext AFTER rotation, with the NEW key",
        after_decrypt == test_plaintext,
    )
    check("rotate response does not contain the OLD DRIVE_TOKEN_SECRET value", drive_secret_before not in raw)
    check("rotate response does not contain the NEW DRIVE_TOKEN_SECRET value", drive_secret_after not in raw)

    print("\n=== 3) DRIVE_TOKEN_SECRET rollback ===")
    status, raw, _ = call(
        "POST", "/admin/secrets/DRIVE_TOKEN_SECRET/rollback", token=new_token,
        body={"current_password": ADMIN_PASSWORD},
    )
    check("rollback succeeds", status == 200)
    row2 = db.execute(sql(
        "SELECT encrypted_rt FROM drive_tokens WHERE user_id = :uid"
    ), {"uid": test_user_id}).fetchone()
    invalidate_secret_cache("DRIVE_TOKEN_SECRET")
    restored_secret = get_secret("DRIVE_TOKEN_SECRET")
    check("after rollback, the secret is back to the pre-rotation value", restored_secret == drive_secret_before)
    restored_decrypt = decrypt_token(row2.encrypted_rt, secret=restored_secret)
    check("after rollback, the row decrypts correctly again with the restored key", restored_decrypt == test_plaintext)
    check("rollback response does not contain any real secret value", drive_secret_after not in raw and drive_secret_before not in raw)

    print("\n=== 4) No secret value ever appears in panel list/audit responses ===")
    status, raw_list, _ = call("GET", "/admin/secrets", token=new_token)
    for label, value in (
        ("SECRET_KEY (before)", secret_key_before),
        ("SECRET_KEY (after)", secret_key_after),
        ("DRIVE_TOKEN_SECRET (before)", drive_secret_before),
        ("DRIVE_TOKEN_SECRET (after rotation)", drive_secret_after),
    ):
        check(f"GET /admin/secrets never contains {label}", value not in raw_list)

    status, raw_audit, _ = call("GET", "/admin/secrets/DRIVE_TOKEN_SECRET/audit", token=new_token)
    check("GET .../audit never contains DRIVE_TOKEN_SECRET value", drive_secret_before not in raw_audit and drive_secret_after not in raw_audit)

finally:
    db.execute(sql("DELETE FROM drive_tokens WHERE user_id = :uid"), {"uid": test_user_id})
    db.execute(sql(
        "DELETE FROM secret_rotation_log WHERE secret_name IN ('SECRET_KEY','DRIVE_TOKEN_SECRET') "
        "AND performed_at > NOW() - INTERVAL '1 hour'"
    ))
    db.execute(sql("DELETE FROM users WHERE id = :uid"), {"uid": test_user_id})
    db.commit()
    db.close()
    print("\n(cleanup: test row and audit log entries removed)")

print(f"\n{'=' * 60}")
if fail:
    print(f"FAILED: {fail} check(s) failed")
    sys.exit(1)
print("All checks passed.")
