from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
import bcrypt as _bcrypt
from app.core.config import settings
from app.services.secret_loader import get_secret, get_secret_previous


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict) -> str:
    payload = data.copy()
    # `iat` (Handover.md nota (58)) — without it, get_current_user has no way
    # to tell a token issued before a password change/reset from one issued
    # after, so a compromised account's existing tokens would keep working
    # past the "fix". jose encodes a datetime here as a Unix timestamp, same
    # as it already does for `exp` below.
    payload["iat"] = datetime.now(timezone.utc)
    payload["exp"] = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload["type"] = "access"
    # Always sign with the CURRENT SECRET_KEY — never the previous one, even
    # during a rotation window (T9, docs/specs/secrets-panel.md §3.1).
    return jwt.encode(payload, get_secret("SECRET_KEY"), algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    payload = data.copy()
    payload["iat"] = datetime.now(timezone.utc)
    payload["exp"] = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload["type"] = "refresh"
    return jwt.encode(payload, get_secret("SECRET_KEY"), algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    """Tries the current SECRET_KEY first, then the previous one (if a
    rotation happened recently) — a session signed before a rotation stays
    valid until the previous version is dropped, instead of every active
    session failing the instant the key changes (T9 §3.1)."""
    try:
        return jwt.decode(token, get_secret("SECRET_KEY"), algorithms=[settings.ALGORITHM])
    except JWTError:
        pass
    previous = get_secret_previous("SECRET_KEY")
    if previous:
        try:
            return jwt.decode(token, previous, algorithms=[settings.ALGORITHM])
        except JWTError:
            pass
    return {}
