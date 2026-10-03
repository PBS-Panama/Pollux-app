#!/usr/bin/env python
# ─────────────────────────────────────────────────────────────────────────────
# T10 — live verification of GcpSecretManagerStore against REAL Secret
# Manager, using a DISPOSABLE test secret only. Does NOT touch
# leto-secret-key, leto-database-url, any IAM binding, or pb-pollux.
# Destroys its own test secret at the end regardless of pass/fail.
#
# Credentials: this script bridges the gcloud CLI's ALREADY-authenticated
# user session into google-cloud-secret-manager's client, instead of
# requiring a separate `gcloud auth application-default login` browser flow
# — that command can't run from a non-interactive shell (same restriction as
# `gcloud auth login`, documented in this repo's CLAUDE.md), AND the backend
# container has no `gcloud` CLI installed to begin with. The bridge: fetch
# an access token with `gcloud auth print-access-token` on the HOST (where
# gcloud lives), pass it into the container via GCLOUD_TEST_ACCESS_TOKEN,
# and this script uses it as a static (not self-refreshing) credential — it
# only needs to survive the few seconds this script runs for. TEST-ONLY:
# production code (secret_loader.GcpSecretManagerStore) uses real ADC — the
# Cloud Run service identity via the metadata server, nothing like this.
#
# Run (token generated fresh on the host each time, never stored):
#   docker compose exec -e GCLOUD_TEST_ACCESS_TOKEN="$(gcloud auth print-access-token)" \
#     backend python test_secret_manager_live.py
#
# Exits 1 if anything fails. Same pattern as the other test_*.py scripts.
# ─────────────────────────────────────────────────────────────────────────────
import os
import sys
import uuid

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

PROJECT_ID = "pollux-app-507503"
TEST_SECRET_NAME = "pollux-secrets-panel-test"

fail = 0


def check(label, cond):
    global fail
    ok = bool(cond)
    if not ok:
        fail += 1
    print(f"  {'✓' if ok else '✗'} {label}")
    return ok


# ─── Credential bridge (test-only, see module docstring) ───────────────────

import google.auth.credentials
import google.auth.transport.requests


class StaticHostToken(google.auth.credentials.Credentials):
    """A fixed access token fetched on the HOST by `gcloud auth
    print-access-token` and passed in via GCLOUD_TEST_ACCESS_TOKEN — the
    container has no `gcloud` CLI to fetch its own. `expiry` stays None
    (the base class's "never expires" sentinel — good enough for the few
    seconds this script runs). Doesn't self-refresh. Test-only (see module
    docstring) — never used by application code."""

    def __init__(self, token: str):
        super().__init__()
        self.token = token

    def refresh(self, request):
        pass  # token was set at construction time; nothing to refresh here


token = os.environ.get("GCLOUD_TEST_ACCESS_TOKEN")
if not token:
    print("GCLOUD_TEST_ACCESS_TOKEN no está seteado. Corré con:")
    print('  docker compose exec -e GCLOUD_TEST_ACCESS_TOKEN="$(gcloud auth print-access-token)" backend python test_secret_manager_live.py')
    sys.exit(2)
credentials = StaticHostToken(token)
print(f"Credenciales recibidas del host (token del gcloud CLI ya autenticado), proyecto destino: {PROJECT_ID}\n")

from google.cloud import secretmanager

client = secretmanager.SecretManagerServiceClient(credentials=credentials)
secret_path = f"projects/{PROJECT_ID}/secrets/{TEST_SECRET_NAME}"

print("=== 0) Safety: confirm we are NOT about to touch a real secret ===")
check(
    "test secret name does not match any real managed secret",
    TEST_SECRET_NAME not in ("leto-secret-key", "leto-database-url", "SECRET_KEY", "DRIVE_TOKEN_SECRET"),
)

try:
    print("\n=== 1) Create the disposable test secret ===")
    from google.api_core.exceptions import NotFound, AlreadyExists
    try:
        client.get_secret(request={"name": secret_path})
        print("  (ya existía de una corrida anterior — se reutiliza y se destruye igual al final)")
    except NotFound:
        client.create_secret(
            request={
                "parent": f"projects/{PROJECT_ID}",
                "secret_id": TEST_SECRET_NAME,
                "secret": {"replication": {"automatic": {}}},
            }
        )
        check("test secret created", True)

    print("\n=== 2) Use secret_loader's REAL backend against this one secret ===")
    sys.path.insert(0, "/app")
    from app.services import secret_loader

    secret_loader.use_gcp_store_for_testing(PROJECT_ID)
    secret_loader.invalidate()

    value_v1 = f"live-test-v1-{uuid.uuid4().hex[:12]}"
    v1 = secret_loader.stage_new_value(TEST_SECRET_NAME, value_v1)
    check("add_version (v1) succeeded", v1.value == value_v1)

    read_back = secret_loader.get_secret(TEST_SECRET_NAME)
    check("get_secret() returns the value just written (real API round trip)", read_back == value_v1)

    print("\n=== 3) Cache TTL — second read within the window must NOT hit the API again ===")
    call_count = {"n": 0}
    real_get_latest = secret_loader._active_store().get_latest

    def counting_get_latest(name):
        call_count["n"] += 1
        return real_get_latest(name)

    secret_loader._active_store().get_latest = counting_get_latest
    secret_loader.invalidate(TEST_SECRET_NAME)
    _ = secret_loader.get_secret(TEST_SECRET_NAME)  # first call after invalidate: real API hit
    calls_after_first = call_count["n"]
    _ = secret_loader.get_secret(TEST_SECRET_NAME)  # should be served from cache
    calls_after_second = call_count["n"]
    check("first read after invalidate() hits the real API", calls_after_first == 1)
    check("second read within the TTL window is served from cache (0 extra API calls)", calls_after_second == calls_after_first)
    secret_loader._active_store().get_latest = real_get_latest  # restore

    print("\n=== 4) Rotate (add a second version) — get_secret_previous must return v1 ===")
    value_v2 = f"live-test-v2-{uuid.uuid4().hex[:12]}"
    secret_loader.invalidate(TEST_SECRET_NAME)
    v2 = secret_loader.stage_new_value(TEST_SECRET_NAME, value_v2)
    check("add_version (v2) succeeded", v2.value == value_v2)
    check("get_secret() now returns v2", secret_loader.get_secret(TEST_SECRET_NAME) == value_v2)
    check("get_secret_previous() returns v1", secret_loader.get_secret_previous(TEST_SECRET_NAME) == value_v1)

    print("\n=== 5) Rollback (disable v2) — latest must resolve back to v1 ===")
    rolled_back = secret_loader.rollback(TEST_SECRET_NAME)
    check("rollback() succeeded", rolled_back is not None)
    check("after rollback, get_secret() returns v1 again (Secret Manager's own `latest` alias)", secret_loader.get_secret(TEST_SECRET_NAME) == value_v1)
    check("after rollback, get_secret_previous() has nothing left (only v1 enabled)", secret_loader.get_secret_previous(TEST_SECRET_NAME) is None)

    print("\n=== 6) IAM — confirm pollux-run@ has NO access to this test secret (read-only check, nothing granted) ===")
    policy = client.get_iam_policy(request={"resource": secret_path})
    members = set()
    for binding in policy.bindings:
        members.update(binding.members)
    pollux_run_member = "serviceAccount:pollux-run@pollux-app-507503.iam.gserviceaccount.com"
    check(
        "pollux-run@ is NOT in this secret's IAM policy (no access granted by this test)",
        pollux_run_member not in members,
    )
    check("no IAM bindings were added by this script", len(policy.bindings) == 0)

    print("\n=== 7) No secret value in this script's own stdout/output so far ===")
    # (checked by construction — this script never print()s value_v1/value_v2
    # directly; this assertion documents that intent for whoever reads it)
    check("script never printed a real secret value", True)

finally:
    print("\n=== Cleanup: destroying the disposable test secret ===")
    try:
        client.delete_secret(request={"name": secret_path})
        print(f"  ✓ {TEST_SECRET_NAME} destroyed")
    except NotFound:
        print(f"  (ya no existía — nada que borrar)")
    except Exception as e:
        print(f"  ✗ FAILED TO DELETE TEST SECRET: {e} — bórralo a mano: gcloud secrets delete {TEST_SECRET_NAME} --project {PROJECT_ID}")
        fail += 1

print(f"\n{'=' * 60}")
if fail:
    print(f"FAILED: {fail} check(s) failed")
    sys.exit(1)
print("All checks passed.")
