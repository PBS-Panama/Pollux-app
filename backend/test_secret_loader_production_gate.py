#!/usr/bin/env python
# ─────────────────────────────────────────────────────────────────────────────
# T16 (2026-10-03, PM Pollux via Dandy): secret_loader._load_latest() used to
# call seed_if_missing() unconditionally, in every environment including
# production — meaning the FIRST read of a MANAGED_SECRET that doesn't exist
# yet in Secret Manager would try to auto-create it from the current env var.
# In practice this failed safely today (pollux-run@'s custom role has no
# secrets.create, so GCP itself would reject it with PermissionDenied), but
# it was the wrong failure mode — the same risk Castor's copy of this file
# already fixed (Handover nota 140, "seed_if_missing() ya no escribe
# implícitamente en producción"). This test proves the mirrored fix: in
# production, a missing secret fails fast with SecretNotConfigured naming
# the secret AND the project, and NEVER calls seed_if_missing/add_version —
# proven with a fake store that raises if either is called, not just by
# checking the final exception.
#
#   cd backend && python test_secret_loader_production_gate.py
#
# Exits with code 1 if anything fails. Same pattern as the other standalone
# test_*.py files in this directory — no pytest.
# ─────────────────────────────────────────────────────────────────────────────
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.core.config import settings
import app.services.secret_loader as secret_loader
from app.services.secret_loader import (
    SecretNotConfigured,
    SecretVersion,
    get_secret,
    invalidate,
)

fail = 0


def check(label, cond):
    global fail
    ok = bool(cond)
    if not ok:
        fail += 1
    print(f"  {'✓' if ok else '✗'} {label}")


class _NeverWritesStore:
    """get_latest() always empty; seed_if_missing()/add_version() raise if
    called at all — proves the production path never even attempts to
    write, not just that the end result is a clean failure."""

    def get_latest(self, name):
        return None

    def get_previous(self, name):
        return None

    def seed_if_missing(self, name, env_value):
        raise AssertionError(f"seed_if_missing() must NEVER be called in production (name={name!r})")

    def add_version(self, name, value):
        raise AssertionError(f"add_version() must NEVER be called in production (name={name!r})")

    def rollback_latest(self, name):
        raise AssertionError("rollback_latest() must never be called by this test")


class _SeedableStore:
    """Mirrors DevFileSecretStore's seed-on-first-read behavior, in memory
    only — for the non-production control case."""

    def __init__(self):
        self._versions = {}

    def get_latest(self, name):
        versions = self._versions.get(name, [])
        return versions[-1] if versions else None

    def get_previous(self, name):
        versions = self._versions.get(name, [])
        return versions[-2] if len(versions) >= 2 else None

    def seed_if_missing(self, name, env_value):
        existing = self.get_latest(name)
        if existing:
            return existing
        if not env_value:
            return None
        version = SecretVersion(version="1", value=env_value, created_at=0.0)
        self._versions[name] = [version]
        return version

    def add_version(self, name, value):
        raise AssertionError("not exercised by this test")

    def rollback_latest(self, name):
        raise AssertionError("not exercised by this test")


_original_environment = settings.ENVIRONMENT
_original_override = secret_loader._testing_store_override

print("\n  secret_loader — gate de produccion en _load_latest() (T16)\n")

try:
    # ── En producción, sin versión guardada: falla, NUNCA siembra ──────────
    settings.ENVIRONMENT = "production"
    secret_loader._testing_store_override = _NeverWritesStore()
    invalidate("_T16_PROD_MISSING")
    try:
        get_secret("_T16_PROD_MISSING")
        check("producción + secreto inexistente -> SecretNotConfigured", False)
    except SecretNotConfigured as e:
        check("producción + secreto inexistente -> SecretNotConfigured", True)
        check("el mensaje nombra el secreto", "_T16_PROD_MISSING" in str(e))
        check("el mensaje nombra el proyecto", secret_loader.SECRET_MANAGER_PROJECT_ID in str(e))
    except AssertionError as e:
        check(f"NO debe intentar escribir en producción (se llamó: {e})", False)

    # ── "prod" (no solo "production") dispara el mismo gate ────────────────
    settings.ENVIRONMENT = "prod"
    invalidate("_T16_PROD_MISSING_2")
    try:
        get_secret("_T16_PROD_MISSING_2")
        check("ENVIRONMENT='prod' también activa el gate", False)
    except SecretNotConfigured:
        check("ENVIRONMENT='prod' también activa el gate", True)
    except AssertionError:
        check("ENVIRONMENT='prod' también activa el gate (sin escribir)", False)

    # ── Fuera de producción, sigue sembrando desde el env var (sin regresión) ──
    settings.ENVIRONMENT = "development"
    secret_loader._testing_store_override = _SeedableStore()
    import os as _os
    _os.environ["_T16_DEV_SEED_FROM_ENV"] = "valor-de-dev-no-es-un-secreto-real"
    invalidate("_T16_DEV_SEED_FROM_ENV")
    try:
        value = get_secret("_T16_DEV_SEED_FROM_ENV")
        check("fuera de producción, sigue sembrando desde el env var", value == "valor-de-dev-no-es-un-secreto-real")
    except Exception as e:
        check(f"fuera de producción, sigue sembrando desde el env var (fallo: {e})", False)
    finally:
        _os.environ.pop("_T16_DEV_SEED_FROM_ENV", None)

    # ── Fuera de producción, sin env var tampoco: sigue fallando igual que antes ──
    invalidate("_T16_DEV_NO_ENV")
    try:
        get_secret("_T16_DEV_NO_ENV")
        check("fuera de producción, sin env var -> SecretNotConfigured", False)
    except SecretNotConfigured as e:
        check("fuera de producción, sin env var -> SecretNotConfigured", True)
        check("mensaje de dev NO menciona 'Secret Manager project' (es el mensaje viejo, no el de prod)",
              "Secret Manager project" not in str(e))

finally:
    settings.ENVIRONMENT = _original_environment
    secret_loader._testing_store_override = _original_override
    for k in ("_T16_PROD_MISSING", "_T16_PROD_MISSING_2", "_T16_DEV_SEED_FROM_ENV", "_T16_DEV_NO_ENV"):
        invalidate(k)

print(f"\n  {'✅ Todo en verde.' if fail == 0 else f'❌ {fail} caso(s) fallando.'} Pegá esta salida en el Handover.\n")
sys.exit(1 if fail else 0)
