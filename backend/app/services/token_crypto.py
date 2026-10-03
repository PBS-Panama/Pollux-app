"""
Symmetric encryption for Google Drive refresh tokens and admin-configured API
keys (api_key_config — reuses this same helper, see admin.py).
Uses Fernet (AES-128-CBC + HMAC-SHA256) from the `cryptography` package
(already available via python-jose[cryptography]).

Key derivation: SHA-256 of DRIVE_TOKEN_SECRET → 32-byte → urlsafe-b64 → Fernet key.
A stable secret produces stable keys across container restarts.

T9 (secrets panel, docs/specs/secrets-panel.md §3.2): DRIVE_TOKEN_SECRET is
now read through secret_loader (cache + dev file store / Secret Manager
later) instead of being snapshotted once from os.environ at import time.
encrypt_token()/decrypt_token() default to the CURRENT secret, but both
accept an explicit `secret` override — the re-encryption routine that runs
when a rotation is confirmed (admin.py's confirm_secret_rotation for
DRIVE_TOKEN_SECRET) needs to decrypt every row with the OLD key and
re-encrypt with the NEW one inside a single DB transaction, before the new
version becomes what get_secret() returns for everyone else.

No fallback: secret_loader.get_secret() already raises loudly if
DRIVE_TOKEN_SECRET has neither a stored version nor an env var to seed from
— same fail-fast guarantee the original module-level check had, just
centralized there instead of duplicated here.
"""

import hashlib
import base64
from cryptography.fernet import Fernet

from app.services.secret_loader import get_secret

_SECRET_NAME = "DRIVE_TOKEN_SECRET"


def _fernet_for(secret: str) -> Fernet:
    key_bytes = hashlib.sha256(secret.encode("utf-8")).digest()  # 32 bytes
    b64_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(b64_key)


def _get_fernet(secret: str | None = None) -> Fernet:
    return _fernet_for(secret if secret is not None else get_secret(_SECRET_NAME))


def encrypt_token(plaintext: str, secret: str | None = None) -> str:
    """Encrypt a refresh token / API key string. Returns a URL-safe base64
    ciphertext. `secret` overrides the current DRIVE_TOKEN_SECRET — used only
    by the rotation re-encryption routine."""
    return _get_fernet(secret).encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_token(ciphertext: str, secret: str | None = None) -> str:
    """Decrypt a previously encrypted value. Raises on bad key/tamper.
    `secret` overrides the current DRIVE_TOKEN_SECRET — used only by the
    rotation re-encryption routine to decrypt with the OLD key."""
    return _get_fernet(secret).decrypt(ciphertext.encode("utf-8")).decode("utf-8")
