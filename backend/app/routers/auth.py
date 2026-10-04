import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.deps import get_current_user, load_active_user
from app.models.user import User, UserRole
from app.models.seafarer import Seafarer
from app.models.company import Company
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.services.seafarer_code import generate_seafarer_code
from app.services.email_sender import get_email_sender

router = APIRouter()

MIN_PASSWORD_LENGTH = 12

# Company approval (Rick, 2026-09-14) — single-use, time-boxed token stored
# in email_verification_tokens (not an ORM model, same convention as
# drive_tokens/relationships — looked up by the opaque token string).
_VERIFICATION_TOKEN_TTL = timedelta(hours=48)
# Password reset (Handover.md nota (58)) — same convention, its own table
# (password_reset_tokens), shorter TTL: a reset link is more sensitive than
# a verification link (it grants account takeover, not just a checkmark).
_RESET_TOKEN_TTL = timedelta(hours=1)


def _send_verification_email(user: User, db: Session) -> None:
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    db.execute(text("""
        INSERT INTO email_verification_tokens (id, user_id, token, created_at, expires_at)
        VALUES (:id, :uid, :token, :now, :expires)
    """), {
        "id": str(uuid.uuid4()), "uid": user.id, "token": token,
        "now": now, "expires": now + _VERIFICATION_TOKEN_TTL,
    })
    verify_url = f"{settings.FRONTEND_URL}/api/auth/verify-email?token={token}"
    get_email_sender().send(
        to=user.email,
        template="verify_email",
        context={"verify_url": verify_url, "expires_hours": 48},
    )


def _send_reset_email(user: User, db: Session) -> None:
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    db.execute(text("""
        INSERT INTO password_reset_tokens (id, user_id, token, created_at, expires_at)
        VALUES (:id, :uid, :token, :now, :expires)
    """), {
        "id": str(uuid.uuid4()), "uid": user.id, "token": token,
        "now": now, "expires": now + _RESET_TOKEN_TTL,
    })
    # Unlike verify-email (a self-contained GET that fully completes the
    # action), completing a reset needs a new password — that has to come
    # from a real form, so this points at a FRONTEND route (landing's own
    # /reset-password page), not `/api/...` like verify-email's link does.
    # That page POSTs {token, new_password} to /api/auth/reset-password.
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    get_email_sender().send(
        to=user.email,
        template="reset_password",
        context={"reset_url": reset_url, "expires_hours": 1},
    )


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
def refresh(request: Request, payload: RefreshRequest, db: Session = Depends(get_db)):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = load_active_user(db, data.get("sub"), data)
    token_data = {"sub": user.id, "role": user.role, "company_id": user.company_id}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/hour")
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    # Validate role
    if payload.role not in ("seafarer", "company"):
        raise HTTPException(status_code=400, detail="role must be 'seafarer' or 'company'")
    if len(payload.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=422, detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters")

    # Check duplicate email
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create base user
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.flush()  # get user.id before committing

    company = None
    if payload.role == "seafarer":
        seafarer = Seafarer(
            id=user.id,
            first_name=payload.first_name or "",
            last_name=payload.last_name or "",
            nationality=payload.nationality,
            phone=payload.phone,
            rank=payload.rank,
            fleet_category=payload.fleet_category,
            date_of_birth=payload.date_of_birth,
        )
        db.add(seafarer)
        user.seafarer_code = generate_seafarer_code(db, payload.nationality)

    elif payload.role == "company":
        company = Company(
            name=payload.company_name or "Unnamed Company",
            contact_email=payload.email,
        )
        db.add(company)
        db.flush()
        user.company_id = company.id

        # Company approval (Rick, 2026-09-14): company_status defaults to
        # 'pending' on the model; the account has no real access until an
        # admin approves it AND this email is verified (see verify_email
        # below and the gate in routers/company.py).
        _send_verification_email(user, db)

    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        company_id=user.company_id,
        seafarer_code=user.seafarer_code,
        created_at=user.created_at,
        email_verified=user.email_verified,
        company_status=company.company_status if company else None,
        company_rejection_reason=company.rejection_reason if company else None,
    )


@router.get("/verify-email")
@limiter.limit("20/minute")
def verify_email(request: Request, token: str, db: Session = Depends(get_db)):
    """Single-use, time-boxed — the link a company account clicks (or, before
    Rick picks an email provider, pastes from the LoggingEmailSender log) to
    prove ownership of the email. Does not by itself grant access: the
    endpoint gate in routers/company.py also requires company_status ==
    'approved'."""
    row = db.execute(text("""
        SELECT user_id, expires_at, used_at FROM email_verification_tokens WHERE token = :token
    """), {"token": token}).fetchone()
    if not row:
        raise HTTPException(status_code=400, detail="Invalid verification link")
    if row.used_at is not None:
        raise HTTPException(status_code=400, detail="This verification link was already used")
    if row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This verification link has expired")

    now = datetime.now(timezone.utc)
    db.execute(text("UPDATE email_verification_tokens SET used_at = :now WHERE token = :token"),
               {"now": now, "token": token})
    db.execute(text("UPDATE users SET email_verified = TRUE WHERE id = :uid"), {"uid": row.user_id})
    db.commit()
    return {"ok": True, "detail": "Email verified"}


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    # Same generic message as a bad password — confirming "this account is
    # deactivated" tells a prober the email exists (Handover.md nota (46), L-7).
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Company accounts also confirm the company name (Pollux is company-only —
    # the frontend's /login form has no role toggle, so this doubles as a
    # lightweight check that a seafarer email didn't end up on this form).
    # Same generic error as a wrong password: don't reveal which field failed.
    if user.role == "company":
        company = db.query(Company).filter(Company.id == user.company_id).first()
        submitted = (payload.company_name or "").strip().lower()
        actual = (company.name if company else "").strip().lower()
        if not submitted or submitted != actual:
            raise HTTPException(status_code=401, detail="Invalid credentials")

    token_data = {"sub": user.id, "role": user.role, "company_id": user.company_id}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
@limiter.limit("5/minute")
def change_password(
    request: Request,
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Authenticated password change — no role restriction, any signed-in user.

    This is the real fix for a temporary/seeded admin password (Handover.md
    nota (46)/(47), L-7): enter with the temporary one, change it from inside
    the session. An email-link reset is a separate, unbuilt flow (no real
    EmailSender yet) — that's account recovery, this is account hygiene.
    Rate-limited same as login: without it, this endpoint is an oracle for
    guessing the current password (wrong current_password -> 401 tells an
    attacker they guessed wrong, right password change succeeds).
    """
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    if len(payload.new_password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=422, detail=f"New password must be at least {MIN_PASSWORD_LENGTH} characters")
    if payload.new_password == payload.current_password:
        raise HTTPException(status_code=422, detail="New password must be different from the current one")

    new_hash = hash_password(payload.new_password)
    now = datetime.now(timezone.utc)
    # password_changed_at (Handover.md nota (58)) — set on every password
    # change, not just reset: this is the column get_current_user checks to
    # revoke sessions issued before it. Changing the password without
    # setting this would leave any already-issued token (up to 8h access,
    # 7 days refresh) working exactly as before — the change would only
    # protect future logins, not the compromised session that likely
    # prompted the change in the first place.
    result = db.execute(text("""
        UPDATE users SET hashed_password = :h, password_changed_at = :now, updated_at = :now WHERE id = :id
    """), {"h": new_hash, "now": now, "id": current_user.id})
    # Don't report success on faith — report what the write actually did
    # (Handover.md nota (46): "no inventes un mensaje de exito que no verificaste").
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(status_code=500, detail="Password update did not apply")
    db.commit()
    return {"ok": True, "detail": "Password changed"}


class ForgotPasswordRequest(BaseModel):
    email: str


@router.post("/forgot-password")
@limiter.limit("5/hour")
def forgot_password(request: Request, payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request a password-reset link (Handover.md nota (58)).

    Always returns the same generic response whether or not the email
    exists — same non-disclosure principle as login/change-password
    (nota (46)): confirming "this account exists" to whoever submits an
    email is a gift to account enumeration, and a password-reset endpoint
    is exactly the kind of thing that gets probed for that.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        _send_reset_email(user, db)
        db.commit()
    return {"ok": True, "detail": "If that email exists, a reset link has been sent"}


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Complete a password reset (Handover.md nota (58)) — no login required,
    the token itself is the credential.

    Also verifies the email and revokes existing sessions: clicking this
    link proves control of the mailbox (same fact verify-email proves, by
    the same means), and password_changed_at makes get_current_user reject
    any token issued before now — the whole point of building a reset flow
    for a possibly-compromised account, not just a "forgot it" convenience.
    """
    row = db.execute(text("""
        SELECT user_id, expires_at, used_at FROM password_reset_tokens WHERE token = :token
    """), {"token": payload.token}).fetchone()
    if not row:
        raise HTTPException(status_code=400, detail="Invalid reset link")
    if row.used_at is not None:
        raise HTTPException(status_code=400, detail="This reset link was already used")
    if row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This reset link has expired")
    if len(payload.new_password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=422, detail=f"New password must be at least {MIN_PASSWORD_LENGTH} characters")

    user_row = db.execute(text("SELECT hashed_password FROM users WHERE id = :id"), {"id": row.user_id}).fetchone()
    if not user_row:
        raise HTTPException(status_code=400, detail="Invalid reset link")
    if verify_password(payload.new_password, user_row.hashed_password):
        raise HTTPException(status_code=422, detail="New password must be different from the current one")

    now = datetime.now(timezone.utc)
    new_hash = hash_password(payload.new_password)
    result = db.execute(text("""
        UPDATE users SET hashed_password = :h, password_changed_at = :now,
            email_verified = TRUE, updated_at = :now
        WHERE id = :id
    """), {"h": new_hash, "now": now, "id": row.user_id})
    # Same rule as change-password: report what the write actually did.
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(status_code=500, detail="Password update did not apply")
    db.execute(text("UPDATE password_reset_tokens SET used_at = :now WHERE token = :token"),
               {"now": now, "token": payload.token})
    db.commit()
    return {"ok": True, "detail": "Password reset"}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    seafarer = db.query(Seafarer).filter(Seafarer.id == current_user.id).first()
    row = db.execute(text("SELECT avatar_b64 FROM users WHERE id = :id"), {"id": current_user.id}).fetchone()
    avatar = row[0] if row else None

    company_status = None
    company_rejection_reason = None
    if current_user.role == "company" and current_user.company_id:
        company = db.query(Company).filter(Company.id == current_user.company_id).first()
        if company:
            company_status = company.company_status
            company_rejection_reason = company.rejection_reason

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        company_id=current_user.company_id,
        seafarer_code=current_user.seafarer_code,
        created_at=current_user.created_at,
        email_verified=current_user.email_verified,
        company_status=company_status,
        company_rejection_reason=company_rejection_reason,
        rank=seafarer.rank if seafarer else None,
        fleet_category=seafarer.fleet_category if seafarer else None,
        first_name=seafarer.first_name if seafarer else None,
        last_name=seafarer.last_name if seafarer else None,
        date_of_birth=seafarer.date_of_birth if seafarer else None,
        avatar=avatar,
        coc_type=seafarer.coc_type if seafarer else None,
        coc_issuing_country=seafarer.coc_issuing_country if seafarer else None,
        coc_tonnage_limit=seafarer.coc_tonnage_limit if seafarer else None,
        cop_tanker_type=seafarer.cop_tanker_type if seafarer else None,
        cop_tanker_level=seafarer.cop_tanker_level if seafarer else None,
        flag_endorsements=seafarer.flag_endorsements if seafarer else None,
        special_endorsements=seafarer.special_endorsements if seafarer else None,
    )
