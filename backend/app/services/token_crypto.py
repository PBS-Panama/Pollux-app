"""
Symmetric encryption for Google Drive refresh tokens.
Uses Fernet (AES-128-CBC + HMAC-SHA256) from the `cryptography` package
(already available via python-jose[cryptography]).

Key derivation: SHA-256 of DRIVE_TOKEN_SECRET env var → 32-byte → urlsafe-b64 → Fernet key.
A stable secret produces stable keys across container restarts.

No fallback: a hardcoded fallback here would mean anyone with repo access
could decrypt every stored Drive refresh token if the real env var was ever
missing in production. This module is imported at startup (main.py imports
app.routers.drive at module load), so a missing DRIVE_TOKEN_SECRET fails the
whole backend immediately instead of silently encrypting/decrypting with a
secret anyone can read in the source.
"""

import hashlib
import base64
import os
from cryptography.fernet import Fernet

_SECRET_ENV_VAR = "DRIVE_TOKEN_SECRET"
_secret = os.environ.get(_SECRET_ENV_VAR)
if not _secret:
    raise RuntimeError(
        f"{_SECRET_ENV_VAR} is not set. Refusing to start — set it as a real "
        "environment variable (Cloud Run env var / Secret Manager in production, "
        "your local .env in development). There is no dev fallback."
    )


def _get_fernet() -> Fernet:
    key_bytes = hashlib.sha256(_secret.encode("utf-8")).digest()  # 32 bytes
    b64_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(b64_key)


def encrypt_token(plaintext: str) -> str:
    """Encrypt a refresh token string. Returns a URL-safe base64 ciphertext."""
    return _get_fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_token(ciphertext: str) -> str:
    """Decrypt a previously encrypted refresh token. Raises on bad key/tamper."""
    return _get_fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
