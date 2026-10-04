"""Admin API — Platform settings, third-party API keys, infra secrets panel, rank catalog (read-only).

Split out of the former single-file routers/admin.py (T18): code moved verbatim,
only the imports were pruned per module. Routes are aggregated in admin/__init__.py.
"""

import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.deps import require_admin
from app.core.rate_limit import limiter
from app.models.user import User
from app.services.token_crypto import encrypt_token
# Aliased: app.services.secret_loader (T9/T10, infra secrets panel — SECRET_KEY/
# DRIVE_TOKEN_SECRET/etc.) also exports a `get_secret`/`invalidate` with a
# DIFFERENT signature. Both modules are used in this file; importing either
# unaliased would silently shadow the other at module-load time regardless
# of which function in the file calls it.
from app.services.secret_store import (
    SECRET_NAMES,
    get_secret as get_api_key_secret,
    invalidate as invalidate_secret_cache,
)

router = APIRouter()

# ─── Module 7 — Platform Configuration ──────────────────────────────────────

class SettingPatch(BaseModel):
    value: str
    description: Optional[str] = None


@router.get("/config/settings")
def get_settings(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT key, value, description, updated_at FROM platform_settings ORDER BY key")).fetchall()
    return [
        {
            "key": r.key,
            "value": r.value,
            "description": r.description,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]


@router.patch("/config/settings/{key}")
def update_setting(
    key: str,
    payload: SettingPatch,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    result = db.execute(text("""
        UPDATE platform_settings
        SET value = :value,
            description = COALESCE(:desc, description),
            updated_at = :now
        WHERE key = :key RETURNING key
    """), {"key": key, "value": payload.value, "desc": payload.description, "now": now}).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Setting not found")
    db.commit()
    return {"key": key, "value": payload.value}


# ─── Third-party secrets — write-only, encrypted (Handover.md nota 48/136) ──
# NOT stored in platform_settings on purpose: that table's GET returns raw
# values to the browser, and a billable API key has no business making that
# round trip. Reuses token_crypto.py (Fernet, same helper Drive refresh
# tokens already use) instead of inventing a second encryption mechanism.
# SECRET_NAMES (app/services/secret_store.py) is the single source of truth
# for which keys live here — see that module's docstring for the full list
# of what's deliberately NOT here (SECRET_KEY, DATABASE_URL, DRIVE_TOKEN_
# SECRET, DRIVE_STATE_SECRET, GOOGLE_OAUTH_CLIENT_ID) and why.
# get_secret() (secret_store.py) reads this table first and falls back to
# the env var, everywhere a consumer needs one of these — the L-4 fail-fast
# in ocr_provider.get_ocr_provider() (RuntimeError when neither is set in
# production) is untouched: it's what keeps a deleted key loud instead of
# letting documents silently sit in 'pending' forever.

class ApiKeyPatch(BaseModel):
    key_name: str
    value: str
    # Same reauth as /secrets/{name}/rotate — a stolen admin session alone
    # must not be able to swap the OCR/Drive keys.
    current_password: str


def _key_hint(value: str) -> str:
    tail = value.strip()[-4:] if len(value.strip()) >= 4 else "****"
    return f"...{tail}"


@router.get("/config/api-keys")
def list_api_keys(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT k.key_name, k.hint, k.updated_at, k.updated_by, u.email AS updated_by_email
        FROM api_key_config k LEFT JOIN users u ON u.id = k.updated_by
    """)).fetchall()
    by_name = {r.key_name: r for r in rows}
    return [
        {
            "key_name": name,
            "configured": name in by_name,
            "hint": by_name[name].hint if name in by_name else None,
            "updated_at": by_name[name].updated_at.isoformat() if name in by_name else None,
            "updated_by": by_name[name].updated_by if name in by_name else None,
            # The panel shows "actualizada por <quién>" — updated_by is a user id.
            "updated_by_email": by_name[name].updated_by_email if name in by_name else None,
        }
        for name in SECRET_NAMES
    ]


@router.patch("/config/api-keys")
@limiter.limit("10/hour")
def update_api_key(
    request: Request,
    payload: ApiKeyPatch,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if payload.key_name not in SECRET_NAMES:
        raise HTTPException(
            status_code=400,
            detail=f"key_name must be one of {SECRET_NAMES}",
        )
    _require_reauth(admin, payload.current_password)
    value = payload.value.strip()
    if not value:
        raise HTTPException(status_code=400, detail="value cannot be empty")

    encrypted = encrypt_token(value)
    hint = _key_hint(value)
    now = datetime.now(timezone.utc)
    db.execute(text("""
        INSERT INTO api_key_config (key_name, encrypted_value, hint, updated_at, updated_by)
        VALUES (:name, :enc, :hint, :now, :by)
        ON CONFLICT (key_name) DO UPDATE
        SET encrypted_value = EXCLUDED.encrypted_value,
            hint = EXCLUDED.hint,
            updated_at = EXCLUDED.updated_at,
            updated_by = EXCLUDED.updated_by
    """), {"name": payload.key_name, "enc": encrypted, "hint": hint, "now": now, "by": admin.id})
    db.commit()
    # So the next get_secret() call (any consumer, same process) sees the new
    # value immediately instead of serving the old one for up to CACHE_TTL_SECONDS.
    invalidate_secret_cache(payload.key_name)
    # Never echo the value back — the whole point of write-only.
    return {"key_name": payload.key_name, "configured": True, "hint": hint, "updated_at": now.isoformat()}


# ─── Test a configured secret against its provider (Handover.md nota 136) ───
# Exercises the value get_secret() would actually return right now (DB first,
# env fallback) with the cheapest real call each provider offers — never a
# document/user-facing operation. Never echoes the value or any fragment of
# it beyond what list_api_keys() already exposes (the 4-char hint).
#
# The provider-specific logic lives in _run_key_test(), a plain function with
# no FastAPI/slowapi decorators, so test_secret_store.py can call it directly
# with a fake value and a monkeypatched provider SDK/urlopen — no HTTP layer,
# no real network call, no real key needed to exercise the branching.
# Identical contract to Castor's (same function name, same response shape) —
# this is the endpoint Rick asked to mirror exactly (T13), replacing the
# 2026-10-02 body-based POST /config/api-keys/test + ocr_provider.check_api_key().

_TINY_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)  # 1x1 transparent PNG — cheapest possible images:annotate call


def _run_key_test(key_name: str, value: str) -> dict:
    """key_name is assumed already validated against SECRET_NAMES, value
    already resolved (truthy) by the caller. Returns the full response dict
    — never raises on a provider-side rejection, only on a programming error
    (unknown key_name)."""
    if key_name == "ANTHROPIC_API_KEY":
        try:
            import anthropic
        except ImportError:
            return {"key_name": key_name, "ok": False, "detail": "anthropic SDK not installed"}
        try:
            # models.list() costs no tokens — just lists what the key can see.
            anthropic.Anthropic(api_key=value).models.list(limit=1)
            return {"key_name": key_name, "ok": True, "detail": "models.list() succeeded"}
        except anthropic.AuthenticationError:
            return {"key_name": key_name, "ok": False, "detail": "authentication failed — key rejected by Anthropic"}
        except Exception as exc:
            return {"key_name": key_name, "ok": False, "detail": f"{type(exc).__name__} (see server logs for detail)"}

    if key_name == "GOOGLE_VISION_API_KEY":
        import urllib.request
        import urllib.parse
        import urllib.error
        try:
            req = urllib.request.Request(
                f"https://vision.googleapis.com/v1/images:annotate?key={urllib.parse.quote(value, safe='')}",
                data=json.dumps({
                    "requests": [{
                        "image": {"content": _TINY_PNG_B64},
                        "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
                    }]
                }).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read())
            outer = (data.get("responses") or [{}])[0]
            if outer.get("error"):
                return {"key_name": key_name, "ok": False, "detail": outer["error"].get("message", "")[:160]}
            return {"key_name": key_name, "ok": True, "detail": "images:annotate succeeded"}
        except urllib.error.HTTPError as exc:
            return {"key_name": key_name, "ok": False, "detail": f"HTTP {exc.code} — key rejected or not enabled for Vision API"}
        except Exception as exc:
            return {"key_name": key_name, "ok": False, "detail": f"{type(exc).__name__} (see server logs for detail)"}

    if key_name == "GOOGLE_DRIVE_CLIENT_SECRET":
        return {
            "key_name": key_name,
            "ok": None,
            "detail": "no verificable sin consentimiento del usuario — el client secret solo se valida "
                      "en un intercambio de token OAuth real (authorization code de un usuario), no hay "
                      "forma de probarlo de forma aislada contra Google",
        }

    raise ValueError(f"no test defined for {key_name}")


@router.post("/config/api-keys/{key_name}/test")
@limiter.limit("10/hour")
def test_api_key(
    request: Request,
    key_name: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if key_name not in SECRET_NAMES:
        raise HTTPException(status_code=400, detail=f"key_name must be one of {SECRET_NAMES}")

    value = get_api_key_secret(key_name, db)
    if not value:
        return {"key_name": key_name, "ok": False, "detail": "not configured (no value in DB or env)"}

    return _run_key_test(key_name, value)


# ─── Infra secrets panel (T8/T9/T10, docs/specs/secrets-panel.md) ───────────
# SECRET_KEY / DRIVE_TOKEN_SECRET / DRIVE_STATE_SECRET — the infra-level
# secrets that live in Secret Manager, not in api_key_config (that table is
# for the third-party API keys above — ANTHROPIC_API_KEY/GOOGLE_VISION_
# API_KEY/GOOGLE_DRIVE_CLIENT_SECRET — a different storage mechanism
# entirely). SECRET_KEY/DRIVE_TOKEN_SECRET are shared with Castor and have
# rotation disabled until Castor supports it (ROTATION_DISABLED, T13). Every
# action logs to secret_rotation_log (0013): who, what,
# which stored version, never the value.

from app.services.secret_loader import (
    MANAGED_SECRETS, AUTO_GENERATABLE, ROTATION_DISABLED, get_secret, get_secret_previous,
    list_metadata, stage_new_value, rollback as _rollback_secret,
    generate_random_value, SecretNotConfigured,
)
from app.core.security import verify_password


def _log_secret_action(db: Session, name: str, action: str, version, result: str, detail: str, admin_id: str) -> None:
    import uuid as _uuid
    db.execute(text("""
        INSERT INTO secret_rotation_log
            (id, secret_name, action, secret_version, result, detail, performed_by, performed_at)
        VALUES (:id, :name, :action, :version, :result, :detail, :by, :now)
    """), {
        "id": str(_uuid.uuid4()), "name": name, "action": action,
        "version": str(version) if version is not None else "-",
        "result": result, "detail": detail[:500], "by": admin_id,
        "now": datetime.now(timezone.utc),
    })


class SecretReauthRequest(BaseModel):
    current_password: str


class SecretRotateRequest(SecretReauthRequest):
    # Optional for every secret in this panel now — all of MANAGED_SECRETS are
    # auto-generatable (AUTO_GENERATABLE). GOOGLE_DRIVE_CLIENT_SECRET, which
    # used to need an explicit value here, moved to api_key_config (T13).
    value: Optional[str] = None


class SecretTestRequest(BaseModel):
    value: Optional[str] = None  # candidate to test; auto-generated if omitted (non-destructive either way)


def _require_reauth(admin: User, current_password: str) -> None:
    if not verify_password(current_password, admin.hashed_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")


def _check_secret_name(name: str) -> None:
    if name not in MANAGED_SECRETS:
        raise HTTPException(status_code=404, detail=f"Unknown secret '{name}' — must be one of {MANAGED_SECRETS}")


@router.get("/secrets")
def list_secrets(admin: User = Depends(require_admin)):
    result = []
    for name in MANAGED_SECRETS:
        meta = list_metadata(name)
        meta["rotation_disabled"] = name in ROTATION_DISABLED
        meta["rotation_disabled_reason"] = ROTATION_DISABLED.get(name)
        result.append(meta)
    return result


def _check_rotation_allowed(name: str) -> None:
    if name in ROTATION_DISABLED:
        raise HTTPException(status_code=403, detail=ROTATION_DISABLED[name])


@router.get("/secrets/{name}/audit")
def secret_audit_log(
    name: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    _check_secret_name(name)
    rows = db.execute(text("""
        SELECT action, secret_version, result, detail, performed_by, performed_at
        FROM secret_rotation_log
        WHERE secret_name = :name
        ORDER BY performed_at DESC
        LIMIT :limit
    """), {"name": name, "limit": limit}).fetchall()
    return [
        {
            "action": r.action, "version": r.secret_version, "result": r.result,
            "detail": r.detail, "performed_by": r.performed_by,
            "performed_at": r.performed_at.isoformat(),
        }
        for r in rows
    ]


def _test_secret_key(candidate: str) -> str:
    test_payload = {"_secrets_panel_test": True}
    token = jwt_encode_for_test(test_payload, candidate)
    decoded = jwt_decode_for_test(token, candidate)
    if decoded.get("_secrets_panel_test") is not True:
        raise ValueError("round trip did not return the expected payload")
    return "sign+verify round trip OK (throwaway token, no real session touched)"


def jwt_encode_for_test(payload: dict, secret: str) -> str:
    from jose import jwt as _jwt
    from app.core.config import settings as _settings
    return _jwt.encode(payload, secret, algorithm=_settings.ALGORITHM)


def jwt_decode_for_test(token: str, secret: str) -> dict:
    from jose import jwt as _jwt
    from app.core.config import settings as _settings
    return _jwt.decode(token, secret, algorithms=[_settings.ALGORITHM])


def _test_drive_token_secret(candidate: str) -> str:
    from app.services.token_crypto import encrypt_token as _enc, decrypt_token as _dec
    probe = "secrets-panel-test-value"
    ciphertext = _enc(probe, secret=candidate)
    plain = _dec(ciphertext, secret=candidate)
    if plain != probe:
        raise ValueError("encrypt/decrypt round trip did not return the original value")
    return "encrypt+decrypt round trip OK (throwaway value, no stored row touched)"


def _test_drive_state_secret(candidate: str) -> str:
    import hashlib as _hashlib
    import hmac as _hmac
    digest = _hmac.new(candidate.encode(), b"probe-user-id", _hashlib.sha256).hexdigest()[:16]
    if len(digest) != 16:
        raise ValueError("HMAC did not produce the expected length")
    return "HMAC sign round trip OK (throwaway state, no real OAuth flow touched)"


@router.post("/secrets/{name}/test")
@limiter.limit("20/hour")
def test_secret(request: Request, name: str, payload: SecretTestRequest, admin: User = Depends(require_admin)):
    """Non-destructive — never writes to Secret Manager/the dev store, never
    touches drive_tokens/api_key_config. Safe to call as many times as
    needed before an actual rotation."""
    _check_secret_name(name)
    candidate = payload.value or (generate_random_value() if name in AUTO_GENERATABLE else None)
    if not candidate:
        raise HTTPException(status_code=400, detail="value is required for this secret (cannot auto-generate)")

    # All of MANAGED_SECRETS has a tester — _check_secret_name above already
    # filtered to one of these 3 names, so this dict is exhaustive, not a
    # fallback for something unlisted (GOOGLE_DRIVE_CLIENT_SECRET isn't in
    # MANAGED_SECRETS at all anymore, T13 — see secret_loader.py).
    testers = {
        "SECRET_KEY": _test_secret_key,
        "DRIVE_TOKEN_SECRET": _test_drive_token_secret,
        "DRIVE_STATE_SECRET": _test_drive_state_secret,
    }
    tester = testers[name]
    try:
        message = tester(candidate)
        return {"ok": True, "message": message}
    except Exception as exc:
        return {"ok": False, "message": f"Test failed: {exc}"}


def _reencrypt_drive_secret_rows(db: Session, old_secret: str, new_secret: str) -> str:
    """Decrypts every drive_tokens.encrypted_rt and api_key_config.encrypted_value
    row with `old_secret` and re-encrypts with `new_secret`, in the caller's
    transaction (not committed here — the caller commits only after this AND
    the new secret version are both ready, so a failure here never leaves a
    rotation half-applied). Returns a short human summary for the audit log."""
    from app.services.token_crypto import encrypt_token as _enc, decrypt_token as _dec

    drive_rows = db.execute(text("SELECT user_id, encrypted_rt FROM drive_tokens")).fetchall()
    for row in drive_rows:
        plain = _dec(row.encrypted_rt, secret=old_secret)
        new_cipher = _enc(plain, secret=new_secret)
        db.execute(
            text("UPDATE drive_tokens SET encrypted_rt = :c WHERE user_id = :uid"),
            {"c": new_cipher, "uid": row.user_id},
        )

    key_rows = db.execute(text("SELECT key_name, encrypted_value FROM api_key_config")).fetchall()
    for row in key_rows:
        plain = _dec(row.encrypted_value, secret=old_secret)
        new_cipher = _enc(plain, secret=new_secret)
        db.execute(
            text("UPDATE api_key_config SET encrypted_value = :c WHERE key_name = :k"),
            {"c": new_cipher, "k": row.key_name},
        )

    return f"re-encrypted {len(drive_rows)} drive_tokens row(s), {len(key_rows)} api_key_config row(s)"


@router.post("/secrets/{name}/rotate")
@limiter.limit("10/hour")
def rotate_secret(
    request: Request, name: str, payload: SecretRotateRequest,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    _check_secret_name(name)
    _check_rotation_allowed(name)
    _require_reauth(admin, payload.current_password)

    new_value = payload.value
    if not new_value:
        if name not in AUTO_GENERATABLE:
            raise HTTPException(status_code=400, detail="value is required for this secret (cannot auto-generate)")
        new_value = generate_random_value()

    detail = "rotated"
    try:
        if name == "DRIVE_TOKEN_SECRET":
            # Order matters, strictly: (1) re-encrypt everything with the new
            # value inside this request's DB transaction, (2) COMMIT that —
            # the DB now genuinely holds data encrypted with the new value,
            # while get_secret() still returns the OLD one — (3) only now
            # flip the secret store to the new value. If we flipped the
            # store before committing the DB and the commit then failed,
            # get_secret() would start returning a key that doesn't match
            # what's actually stored in the rows — exactly the inconsistency
            # this ordering exists to rule out.
            try:
                old_value = get_secret(name)
            except SecretNotConfigured:
                old_value = None
            if old_value:
                detail = _reencrypt_drive_secret_rows(db, old_value, new_value)
                db.commit()
        version = stage_new_value(name, new_value)
        _log_secret_action(db, name, "rotate", version.version, "ok", detail, admin.id)
        db.commit()
        return {"name": name, "hint": list_metadata(name)["hint"], "version": version.version, "detail": detail}
    except Exception as exc:
        db.rollback()
        _log_secret_action(db, name, "rotate", None, "error", str(exc)[:200], admin.id)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Rotation failed, nothing was changed: {exc}")


@router.post("/secrets/{name}/rollback")
@limiter.limit("10/hour")
def rollback_secret(
    request: Request, name: str, payload: SecretReauthRequest,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    _check_secret_name(name)
    _check_rotation_allowed(name)
    _require_reauth(admin, payload.current_password)

    meta = list_metadata(name)
    if not meta["has_previous"]:
        raise HTTPException(status_code=400, detail="No previous version to roll back to")

    detail = "rolled back"
    try:
        if name == "DRIVE_TOKEN_SECRET":
            # Same ordering rule as rotate: re-encrypt + commit BEFORE
            # flipping the secret store back.
            current_value = get_secret(name)
            previous_value = get_secret_previous(name)
            detail = _reencrypt_drive_secret_rows(db, current_value, previous_value)
            db.commit()
        new_latest = _rollback_secret(name)
        _log_secret_action(db, name, "rollback", new_latest.version if new_latest else None, "ok", detail, admin.id)
        db.commit()
        return {
            "name": name, "hint": list_metadata(name)["hint"],
            "version": new_latest.version if new_latest else None, "detail": detail,
        }
    except Exception as exc:
        db.rollback()
        _log_secret_action(db, name, "rollback", None, "error", str(exc)[:200], admin.id)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Rollback failed, nothing was changed: {exc}")


# Read-only: since Fase 2 (2026-09-14, nota (25)) nothing in the compliance
# calculation reads this table — membership lives in document_requirements.py.
# Its create/update/delete endpoints answered 410 and no UI calls them anymore
# (T16), so they were deleted.
@router.get("/config/catalog")
def get_rank_catalog_admin(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, rank, fleet_cat, doc_name, cert, level, cert_type, validity_years, is_required
        FROM rank_compliance_catalog
        ORDER BY fleet_cat, rank, id
    """)).fetchall()
    result: dict = {}
    for r in rows:
        rank = r.rank
        if rank not in result:
            result[rank] = {"count": 0, "fleet_cat": r.fleet_cat, "docs": []}
        result[rank]["docs"].append({
            "id": r.id,
            "name": r.doc_name,
            "cert": r.cert,
            "level": r.level,
            "cert_type": r.cert_type,
            "validity_years": r.validity_years,
            "is_required": r.is_required,
        })
        result[rank]["count"] = len(result[rank]["docs"])
    return result
