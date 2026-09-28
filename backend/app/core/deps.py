from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import decode_token
from app.models.user import User

bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    # Without this, a token issued before an account was deactivated keeps
    # working until it naturally expires — the admin panel's "deactivate"
    # button did nothing (Handover.md nota (46), L-7).
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    # Same principle applied to a password change/reset (Handover.md nota
    # (58)): a token issued BEFORE the last password change is no longer
    # valid, even if it hasn't expired yet — this is what actually revokes a
    # compromised account's existing sessions. NULL means the password was
    # never changed since this column existed, so nothing to reject against.
    if user.password_changed_at is not None:
        iat = payload.get("iat")
        if iat is None or iat < user.password_changed_at.timestamp():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
