"""
Secret loader — in-memory cache + versioned store for the infra secrets panel
(T8 design: docs/specs/secrets-panel.md; T9: local file-backed dev store;
T10: real Google Secret Manager backend).

Two backends, picked automatically by ENVIRONMENT:

  - GcpSecretManagerStore (production, and anyone with ADC who sets
    SECRET_MANAGER_PROJECT_ID): talks to the real Secret Manager API via
    Application Default Credentials — no key file, same pattern as
    embarkation_storage.py's google-cloud-storage client. Uses Secret
    Manager's OWN "latest" alias and per-version enable/disable instead of
    reimplementing version tracking: `latest` always resolves to the
    newest ENABLED version, so a "rollback" is just disabling the current
    newest version — Secret Manager itself then serves the one before it
    as `latest`, no bookkeeping needed on this side.
  - DevFileSecretStore (local dev, the T9 implementation): a JSON file
    under backend/.devsecrets/ (gitignored, plaintext — a development
    convenience, never used when ENVIRONMENT=production). The FIRST time a
    name is read and has no versions yet, it seeds version 1 from the
    current env var (today's behavior, so nothing breaks for a secret
    nobody has rotated through the panel yet).

Cache: each name's current value is kept in memory for up to
_CACHE_TTL_SECONDS (5 minutes). This matters once there is more than one
Cloud Run instance: calling invalidate() only clears the cache of the
instance that handled the rotation request — the others keep serving their
cached value until it expires on its own. The double-key verification
window (SECRET_KEY, DRIVE_STATE_SECRET) MUST be longer than this TTL, or an
instance that hasn't refreshed yet could reject a token signed by one that
already has — 5 minutes of cache against a 7-day minimum window leaves
enormous margin.
"""
from __future__ import annotations

import json
import os
import threading
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Protocol

from app.core.config import settings

_CACHE_TTL_SECONDS = 300  # 5 minutes — see module docstring for why this must be << the double-key window

_DEV_STORE_DIR = Path(__file__).resolve().parent.parent.parent / ".devsecrets"
_DEV_STORE_FILE = _DEV_STORE_DIR / "store.json"

# All of this panel's secrets — shared or not — live in ONE GCP project
# (docs/specs/secrets-panel.md §2.3: a secret has a single owning project,
# the other side gets read-only IAM, never two synced copies). Overridable
# for testing against a throwaway project/secret without touching real ones.
SECRET_MANAGER_PROJECT_ID = os.environ.get("SECRET_MANAGER_PROJECT_ID", "pollux-app-507503")

# Secrets this panel knows how to manage. Anything not listed here can still
# be read via get_secret() (it'll just seed-and-never-rotate from the env
# var), but only these show up in the panel's list endpoint.
#
# GOOGLE_DRIVE_CLIENT_SECRET moved OUT of this panel entirely (T13,
# 2026-10-03, Rick's call relayed by Dandy): Castor's contract
# (Handover.md nota 136) puts it in api_key_config instead — same table
# ANTHROPIC_API_KEY/GOOGLE_VISION_API_KEY already use, read via
# app/services/secret_store.get_secret(). One source of truth for a value
# both Pollux and Castor's google_drive.py read, instead of this panel's
# Secret Manager copy and Castor having no copy at all. See
# docs/specs/secrets-panel.md §9 for the full reasoning.
MANAGED_SECRETS = (
    "SECRET_KEY",
    "DRIVE_TOKEN_SECRET",
    "DRIVE_STATE_SECRET",
)

# Secrets shared with Castor's backend/Node process, where rotating here
# would silently break the OTHER service: Castor has NOT implemented the
# double-key verification window (SECRET_KEY) or Secret Manager reads
# (DRIVE_TOKEN_SECRET) yet (T13, confirmed by reading Castor's repo, not
# assumed). Rotation is disabled for these — still visible (hint, last
# rotation) so the panel doesn't just hide that they exist — with the
# reason surfaced to the admin instead of a bare 403. Lift this once
# Castor's dev confirms the same support is live there (docs/specs/
# secrets-panel.md §9, item 1 of the list for Castor's PM).
#
# DRIVE_STATE_SECRET is NOT in here: confirmed via Handover.md nota (41)
# (2026-10-02, "SECRET_KEY y DRIVE_TOKEN_SECRET igualados a los de Castor")
# that only those two were ever deliberately synced between the two local
# envs — DRIVE_STATE_SECRET was never mentioned, consistent with it being
# purely transient (an OAuth CSRF HMAC verified within the same request/
# response cycle, nothing persisted) and never needing to match across
# products. No value was read to reach this conclusion — see that module's
# own note for the evidence trail if this ever needs re-confirming.
ROTATION_DISABLED: dict[str, str] = {
    "SECRET_KEY": (
        "Compartido con el backend Python y el servidor Node de Castor. "
        "Castor todavía no implementó la ventana de doble clave — rotar acá "
        "tumbaría sus sesiones de inmediato. Pendiente de soporte en Castor."
    ),
    "DRIVE_TOKEN_SECRET": (
        "Compartido con el backend Python de Castor (misma tabla "
        "api_key_config y drive_tokens en leto-postgres). Castor todavía no "
        "lee este secreto desde Secret Manager — rotar acá dejaría sus "
        "filas cifradas ilegibles para su proceso. Pendiente de soporte en "
        "Castor."
    ),
}

# Secrets the store can generate a new random value for on rotation. The
# names here are exactly MANAGED_SECRETS — GOOGLE_DRIVE_CLIENT_SECRET never
# belonged here (it needs an explicit value from Google's own console, this
# app has no authority to invent one) and has moved to api_key_config
# anyway, where rotation already requires an explicit value by design.
AUTO_GENERATABLE = (
    "SECRET_KEY",
    "DRIVE_TOKEN_SECRET",
    "DRIVE_STATE_SECRET",
)


@dataclass
class SecretVersion:
    version: str  # Secret Manager version numbers are strings ("1", "2", ...); the dev store mirrors that
    value: str
    created_at: float  # epoch seconds, not persisted as a secret


class SecretNotConfigured(RuntimeError):
    """Raised when a required secret has no env var and no stored version —
    same fail-fast spirit as token_crypto.py's original RuntimeError."""


class SecretStore(Protocol):
    """What secret_loader needs from a backend. Both implementations below
    satisfy this without a shared base class — duck typing is enough for
    two classes this small."""

    def get_latest(self, name: str) -> Optional[SecretVersion]: ...
    def get_previous(self, name: str) -> Optional[SecretVersion]: ...
    def seed_if_missing(self, name: str, env_value: Optional[str]) -> Optional[SecretVersion]: ...
    def add_version(self, name: str, value: str) -> SecretVersion: ...
    def rollback_latest(self, name: str) -> Optional[SecretVersion]: ...


# ─── Dev file-backed store (local only) ─────────────────────────────────────

class DevFileSecretStore:
    """Plaintext JSON file under backend/.devsecrets/. Dev convenience only —
    never used in production (see _store()). Clearly separated from
    anything that talks to real infrastructure: this class never imports
    google-cloud anything and never will."""

    def __init__(self, path: Path):
        self._path = path
        self._lock = threading.Lock()

    def _read_all(self) -> dict:
        if not self._path.exists():
            return {}
        with open(self._path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write_all(self, data: dict) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self._path.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        tmp.replace(self._path)

    def _versions(self, data: dict, name: str) -> list[dict]:
        return data.get(name, [])

    def get_latest(self, name: str) -> Optional[SecretVersion]:
        versions = self._versions(self._read_all(), name)
        return SecretVersion(**versions[-1]) if versions else None

    def get_previous(self, name: str) -> Optional[SecretVersion]:
        versions = self._versions(self._read_all(), name)
        return SecretVersion(**versions[-2]) if len(versions) >= 2 else None

    def seed_if_missing(self, name: str, env_value: Optional[str]) -> Optional[SecretVersion]:
        with self._lock:
            data = self._read_all()
            existing = self._versions(data, name)
            if existing:
                return SecretVersion(**existing[-1])
            if not env_value:
                return None
            new_version = {"version": "1", "value": env_value, "created_at": time.time()}
            data[name] = [new_version]
            self._write_all(data)
            return SecretVersion(**new_version)

    def add_version(self, name: str, value: str) -> SecretVersion:
        with self._lock:
            data = self._read_all()
            existing = self._versions(data, name)
            next_num = int(existing[-1]["version"]) + 1 if existing else 1
            new_version = {"version": str(next_num), "value": value, "created_at": time.time()}
            existing.append(new_version)
            data[name] = existing
            self._write_all(data)
            return SecretVersion(**new_version)

    def rollback_latest(self, name: str) -> Optional[SecretVersion]:
        with self._lock:
            data = self._read_all()
            existing = self._versions(data, name)
            if len(existing) <= 1:
                return None  # never pop the only/seed version
            existing.pop()
            data[name] = existing
            self._write_all(data)
            return SecretVersion(**existing[-1])


_dev_store = DevFileSecretStore(_DEV_STORE_FILE)


# ─── Real Google Secret Manager store (T10) ─────────────────────────────────

class GcpSecretManagerStore:
    """Application Default Credentials only — no key file, matching every
    other GCP client in this codebase (google_drive.py, embarkation_storage.py,
    gmail_api.py). Uses Secret Manager's own `latest` alias and per-version
    enable/disable state instead of reimplementing version bookkeeping:

      - get_latest(): access_secret_version(.../versions/latest) — Secret
        Manager resolves this to the newest ENABLED version on its own.
      - get_previous(): list_secret_versions (metadata only — no payload
        fetched for versions we don't need), find the newest and
        second-newest ENABLED versions by number, fetch the second one's
        payload only if it exists.
      - rollback_latest(): disable the current newest ENABLED version. The
        `latest` alias then automatically resolves to what was previously
        the second-newest — no separate "pointer" to move.

    A secret that doesn't exist yet in Secret Manager (first-ever rotation
    of a name nobody has created there) is auto-created on add_version() /
    seed_if_missing() with automatic replication — same replication policy
    `leto-secret-key`/`leto-database-url` already use (confirmed read-only
    via `gcloud secrets describe` before writing any code here).
    """

    def __init__(self, project_id: str):
        self._project_id = project_id
        self._client = None  # lazy — don't import/construct the GCP client until actually needed

    def _get_client(self):
        if self._client is None:
            from google.cloud import secretmanager
            self._client = secretmanager.SecretManagerServiceClient()
        return self._client

    def _secret_path(self, name: str) -> str:
        return f"projects/{self._project_id}/secrets/{name}"

    def _version_path(self, name: str, version: str) -> str:
        return f"{self._secret_path(name)}/versions/{version}"

    def _secret_exists(self, name: str) -> bool:
        from google.api_core.exceptions import NotFound
        try:
            self._get_client().get_secret(request={"name": self._secret_path(name)})
            return True
        except NotFound:
            return False

    def _ensure_secret_exists(self, name: str) -> None:
        if self._secret_exists(name):
            return
        self._get_client().create_secret(
            request={
                "parent": f"projects/{self._project_id}",
                "secret_id": name,
                "secret": {"replication": {"automatic": {}}},
            }
        )

    def _enabled_versions_desc(self, name: str) -> list:
        """Metadata only (name + version number + state) — never fetches a
        payload. Newest first. Empty list if the secret doesn't exist yet."""
        if not self._secret_exists(name):
            return []
        from google.cloud import secretmanager
        versions = self._get_client().list_secret_versions(
            request={"parent": self._secret_path(name)}
        )
        enabled = [v for v in versions if v.state == secretmanager.SecretVersion.State.ENABLED]
        enabled.sort(key=lambda v: v.create_time, reverse=True)
        return enabled

    def _fetch(self, name: str, version: str) -> SecretVersion:
        response = self._get_client().access_secret_version(
            request={"name": self._version_path(name, version)}
        )
        # version metadata (create_time) isn't on the access response — a
        # second, metadata-only call gets it without fetching the payload
        # twice. Cheap: this only runs on an actual cache miss (every
        # _CACHE_TTL_SECONDS at most per name, per instance).
        meta = self._get_client().get_secret_version(
            request={"name": self._version_path(name, version)}
        )
        return SecretVersion(
            version=version,
            value=response.payload.data.decode("utf-8"),
            created_at=meta.create_time.timestamp(),
        )

    def get_latest(self, name: str) -> Optional[SecretVersion]:
        from google.api_core.exceptions import NotFound
        if not self._secret_exists(name):
            return None
        try:
            return self._fetch(name, "latest")
        except NotFound:
            return None

    def get_previous(self, name: str) -> Optional[SecretVersion]:
        enabled = self._enabled_versions_desc(name)
        if len(enabled) < 2:
            return None
        version_number = enabled[1].name.rsplit("/", 1)[-1]
        return self._fetch(name, version_number)

    def seed_if_missing(self, name: str, env_value: Optional[str]) -> Optional[SecretVersion]:
        existing = self.get_latest(name)
        if existing:
            return existing
        if not env_value:
            return None
        return self.add_version(name, env_value)

    def add_version(self, name: str, value: str) -> SecretVersion:
        self._ensure_secret_exists(name)
        response = self._get_client().add_secret_version(
            request={"parent": self._secret_path(name), "payload": {"data": value.encode("utf-8")}}
        )
        version_number = response.name.rsplit("/", 1)[-1]
        return self._fetch(name, version_number)

    def rollback_latest(self, name: str) -> Optional[SecretVersion]:
        enabled = self._enabled_versions_desc(name)
        if len(enabled) < 2:
            return None  # nothing to roll back to
        newest_version_number = enabled[0].name.rsplit("/", 1)[-1]
        self._get_client().disable_secret_version(
            request={"name": self._version_path(name, newest_version_number)}
        )
        return self.get_latest(name)  # now resolves to what was previously second-newest


def _is_production() -> bool:
    return settings.ENVIRONMENT.strip().lower() in {"production", "prod"}


_gcp_store: Optional[GcpSecretManagerStore] = None


def _store() -> SecretStore:
    if _is_production():
        global _gcp_store
        if _gcp_store is None:
            _gcp_store = GcpSecretManagerStore(SECRET_MANAGER_PROJECT_ID)
        return _gcp_store
    return _dev_store


def use_gcp_store_for_testing(project_id: str) -> None:
    """Test-only escape hatch (T10 verification against a real, disposable
    secret) — points THIS PROCESS at a real GcpSecretManagerStore even
    though ENVIRONMENT isn't production, without making the dev file store
    unreachable for every other secret. Never called from application code,
    only from a verification script run explicitly."""
    global _gcp_store
    _gcp_store = GcpSecretManagerStore(project_id)


_testing_store_override: Optional[SecretStore] = None


def _active_store() -> SecretStore:
    if _testing_store_override is not None:
        return _testing_store_override
    return _store()


# ─── In-memory cache ─────────────────────────────────────────────────────────

_cache_lock = threading.Lock()
_cache: dict[str, tuple[SecretVersion, float]] = {}  # name -> (version, cached_at)


def _cached(name: str) -> Optional[SecretVersion]:
    with _cache_lock:
        entry = _cache.get(name)
        if entry and (time.time() - entry[1]) < _CACHE_TTL_SECONDS:
            return entry[0]
    return None


def _set_cache(name: str, version: SecretVersion) -> None:
    with _cache_lock:
        _cache[name] = (version, time.time())


def invalidate(name: Optional[str] = None) -> None:
    """Clears the LOCAL instance's cache only. With more than one Cloud Run
    instance, the others keep their cached value until _CACHE_TTL_SECONDS
    passes on its own — this is why the double-key window has to be much
    longer than the cache TTL (see module docstring)."""
    with _cache_lock:
        if name is None:
            _cache.clear()
        else:
            _cache.pop(name, None)


def _load_latest(name: str) -> Optional[SecretVersion]:
    store = _active_store()
    latest = store.get_latest(name)
    if latest is None:
        latest = store.seed_if_missing(name, os.environ.get(name))
    return latest


def get_secret(name: str) -> str:
    """Current (latest) value of `name`. Raises SecretNotConfigured if there
    is no stored version and no env var to seed from — same fail-fast
    behavior the original token_crypto.py/drive.py had for a missing env
    var, just centralized here."""
    cached = _cached(name)
    if cached is not None:
        return cached.value
    latest = _load_latest(name)
    if latest is None:
        raise SecretNotConfigured(
            f"{name} is not set. Set it as a real environment variable "
            "(your local .env in development) or rotate it once from the "
            "panel. There is no dev fallback."
        )
    _set_cache(name, latest)
    return latest.value


def get_secret_previous(name: str) -> Optional[str]:
    """The version before latest, for double-key verification. None if the
    secret has never been rotated (only one version exists)."""
    previous = _active_store().get_previous(name)
    return previous.value if previous else None


def list_metadata(name: str) -> dict:
    """Panel-facing metadata for one secret: hint, version count, whether a
    rollback target exists. Never the value itself."""
    try:
        latest = _load_latest(name)
    except Exception:
        latest = None
    if latest is None:
        return {
            "name": name,
            "configured": False,
            "hint": None,
            "version": None,
            "last_rotated_at": None,
            "has_previous": False,
        }
    tail = latest.value.strip()[-4:] if len(latest.value.strip()) >= 4 else "****"
    has_previous = _active_store().get_previous(name) is not None
    return {
        "name": name,
        "configured": True,
        "hint": f"...{tail}",
        "version": latest.version,
        "last_rotated_at": latest.created_at,
        "has_previous": has_previous,
    }


def stage_new_value(name: str, value: str) -> SecretVersion:
    """Adds a new version — callers that need the rotation to also migrate
    data (DRIVE_TOKEN_SECRET's re-encryption) must do that migration using
    this returned version's value BEFORE calling anything that reads
    get_secret(name) again, since add_version already makes it "latest" in
    the store. admin.py wraps this so the re-encryption's DB transaction
    commits BEFORE this is called — see rotate_secret() there."""
    version = _active_store().add_version(name, value)
    invalidate(name)
    return version


def rollback(name: str) -> Optional[SecretVersion]:
    """Rolls back to the previous version. Returns the version that is now
    current, or None if there was nothing to roll back to (only one version
    existed)."""
    result = _active_store().rollback_latest(name)
    invalidate(name)
    return result


def generate_random_value() -> str:
    """A fresh random value suitable for SECRET_KEY/DRIVE_TOKEN_SECRET/
    DRIVE_STATE_SECRET — all three are symmetric keys derived or used
    directly as HMAC/JWT secrets, not credentials issued by a third party."""
    return uuid.uuid4().hex + uuid.uuid4().hex  # 64 hex chars, no external dependency needed
