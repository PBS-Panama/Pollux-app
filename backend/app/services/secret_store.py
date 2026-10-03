"""
Centralized resolver for third-party secrets that CAN live in the
`api_key_config` table (Handover.md nota 48; Castor Handover.md nota 133/136
— this module mirrors Castor's `app/services/secret_store.py` exactly, same
contract, same shared `leto-postgres`, T13) — DB value first (decrypted with
DRIVE_TOKEN_SECRET via token_crypto.py), env var fallback.

SECRET_NAMES is the single source of truth for which keys the admin panel is
allowed to store/rotate here. app/routers/admin.py imports it instead of
keeping its own separate list.

Deliberately NOT here — see Castor's Handover.md nota 133/136 for why each
one is structurally wrong for this table (same reasons apply identically to
Pollux, same shared DB/secrets):
    DATABASE_URL          — the DB connection itself; can't live inside it.
    SECRET_KEY             — signs JWTs verified by Pollux, Castor's Python
                              backend, AND Castor's Node server. Rotating it
                              here wouldn't reach the other two processes.
    DRIVE_TOKEN_SECRET      — the key that decrypts this very table (and the
                              Drive refresh tokens). Circular if stored here.
    DRIVE_STATE_SECRET      — OAuth CSRF HMAC key, same class of problem
                              (also not confirmed shared with Castor at all
                              — see docs/specs/secrets-panel.md T13 section).
    GOOGLE_OAUTH_CLIENT_ID  — not a secret (public OAuth client ID; Castor's
                              seafarer "Sign in with Google" ships it in the
                              browser bundle already). Pollux doesn't even
                              have this feature, but the name stays excluded
                              for contract parity with Castor.

Caching: short in-memory TTL (<=60s) so a rotation via the admin panel is
visible to the next call without a redeploy, without hitting Postgres on
every single use. invalidate() is called right after a successful write so
the SAME process sees the new value immediately instead of waiting out the
TTL. Per-process only — with more than one worker process, a rotation can
take up to CACHE_TTL_SECONDS to reach the OTHER workers (no cross-process
invalidation; matches Castor's documented limitation, same scale here).
"""

import os
import time
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.token_crypto import decrypt_token

SECRET_NAMES = ("ANTHROPIC_API_KEY", "GOOGLE_VISION_API_KEY", "GOOGLE_DRIVE_CLIENT_SECRET")

CACHE_TTL_SECONDS = 60
_cache: dict[str, tuple[float, Optional[str]]] = {}


def _read_from_db(db: Session, name: str) -> str:
    """Decrypt failures (wrong DRIVE_TOKEN_SECRET, corrupted row) fall back
    to the env var rather than hard-failing the caller over a config-table
    problem — same reasoning as the old ocr_provider._read_key_from_db()."""
    try:
        row = db.execute(
            text("SELECT encrypted_value FROM api_key_config WHERE key_name = :k"),
            {"k": name},
        ).fetchone()
        if row and row.encrypted_value:
            return decrypt_token(row.encrypted_value).strip()
    except Exception:
        pass
    return ""


def get_secret(name: str, db: Optional[Session] = None) -> Optional[str]:
    """DB (decrypted) first, env var fallback, `None` if neither has it.
    `db=None` (tests, scripts with no request-scoped session handy) skips
    the DB lookup and goes straight to the env var — same contract as the
    functions this replaces, except for the `None` (they returned `""`):
    callers that need a plain string for string-building (e.g. urlencode)
    must coalesce it themselves — see google_drive.get_client_secret()."""
    now = time.monotonic()
    cached = _cache.get(name)
    if cached is not None and (now - cached[0]) < CACHE_TTL_SECONDS:
        return cached[1]

    value = (db and _read_from_db(db, name)) or os.environ.get(name, "").strip() or None
    _cache[name] = (now, value)
    return value


def invalidate(name: Optional[str] = None) -> None:
    """Drop the cached value(s) so the very next get_secret() call re-reads
    the DB/env instead of serving a stale value for up to CACHE_TTL_SECONDS.
    Call this right after writing a new value to api_key_config."""
    if name is None:
        _cache.clear()
    else:
        _cache.pop(name, None)
