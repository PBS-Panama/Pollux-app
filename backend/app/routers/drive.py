"""
Obj.4 — Google Drive Connector
OAuth 2.0 per-user flow + backup/import endpoints.

Endpoints:
    GET  /api/drive/auth-url          → { url, configured }
    GET  /api/drive/callback?code=... → redirect to /app/#/settings?drive=connected
    GET  /api/drive/status            → { connected, email, last_sync_at }
    DELETE /api/drive/revoke          → { ok }
    POST /api/drive/backup            → { ok, folder_id, files_uploaded }
    GET  /api/drive/files             → { files: [...] }
    POST /api/drive/import            → { ok, doc_id }  (triggers OCR)
"""

import hashlib
import hmac
import json
import re
import secrets
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.db.session import get_db, SessionLocal
from app.models.user import User
from app.services.doc_analyzer import analyze_document_background
from app.services.google_drive import (
    DriveService, build_auth_url, exchange_code, get_user_email,
    is_configured, revoke_token,
)
from app.services.token_crypto import decrypt_token, encrypt_token
from app.services.secret_loader import get_secret, get_secret_previous

router = APIRouter()

# Fail fast at import time, same as before T9 — just sourced from
# secret_loader (dev file store seeded from the env var) instead of reading
# os.environ directly. The value itself isn't kept in a module global
# anymore so a rotation takes effect without a restart (T9 §3, lower risk
# than SECRET_KEY/DRIVE_TOKEN_SECRET since nothing persistent is signed with
# it — see docs/specs/secrets-panel.md §1.1).
get_secret("DRIVE_STATE_SECRET")
_CASTOR_BASE  = settings.CASTOR_BASE_URL


# ─── State HMAC helpers (CSRF protection in OAuth callback) ──────────────────

STATE_TTL_SECONDS = 600


def _sign(payload: str, secret: str) -> str:
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


def _make_state(user_id: str) -> str:
    payload = f"{user_id}.{int(time.time())}.{secrets.token_urlsafe(8)}"
    return f"{payload}.{_sign(payload, get_secret('DRIVE_STATE_SECRET'))}"


def _verify_state(state: str) -> str:
    """Return user_id if state is valid and fresh, raise HTTPException otherwise.
    State = user_id.ts.nonce.hmac; expires after STATE_TTL_SECONDS.
    Tries the current DRIVE_STATE_SECRET, then the previous one — an OAuth
    flow started just before a rotation can still complete instead of
    forcing the user to restart it (T9 §3.1 pattern, reused here even though
    this secret doesn't strictly need the dual-key window)."""
    parts = state.split(".")
    if len(parts) != 4 or not parts[1].isdigit():
        raise HTTPException(status_code=400, detail="Invalid state")
    user_id, ts, _nonce, sig = parts
    payload = ".".join(parts[:3])
    if time.time() - int(ts) > STATE_TTL_SECONDS:
        raise HTTPException(status_code=400, detail="State expired")
    for secret in (get_secret("DRIVE_STATE_SECRET"), get_secret_previous("DRIVE_STATE_SECRET")):
        if secret and hmac.compare_digest(sig, _sign(payload, secret)):
            return user_id
    raise HTTPException(status_code=400, detail="State mismatch — possible CSRF")


# ─── Token helpers ────────────────────────────────────────────────────────────

def _get_tokens(user_id: str, db: Session) -> Optional[tuple]:
    """Return (encrypted_rt, google_email) or None if not connected."""
    row = db.execute(text("""
        SELECT encrypted_rt, google_email, last_sync_at
        FROM drive_tokens WHERE user_id = :uid
    """), {"uid": user_id}).fetchone()
    return row


def _build_service(user_id: str, db: Session) -> DriveService:
    row = _get_tokens(user_id, db)
    if not row:
        raise HTTPException(status_code=400, detail="Google Drive not connected")
    rt = decrypt_token(row.encrypted_rt)
    from app.services.google_drive import refresh_access_token
    tok = refresh_access_token(rt, db)
    return DriveService(access_token=tok["access_token"], refresh_token=rt, db=db)


# ─── Multipart upload to castor Express ──────────────────────────────────────

def _upload_to_castor(user_id: str, file_bytes: bytes, filename: str,
                      doc_name: str, category: int, category_label: str,
                      mime_type: str, jwt: str) -> dict:
    boundary = b"LetoDriveBoundary1234"

    def _part(name: str, value, fname: str = "", ctype: str = "") -> bytes:
        disp = f'Content-Disposition: form-data; name="{name}"'
        if fname:
            disp += f'; filename="{fname}"'
        hdr = disp + "\r\n"
        if ctype:
            hdr += f"Content-Type: {ctype}\r\n"
        return (
            b"--" + boundary + b"\r\n"
            + hdr.encode() + b"\r\n"
            + (value if isinstance(value, bytes) else str(value).encode()) + b"\r\n"
        )

    body = (
        _part("file", file_bytes, filename, mime_type)
        + _part("documentName", doc_name)
        + _part("category", category)
        + _part("categoryLabel", category_label)
        + b"--" + boundary + b"--\r\n"
    )

    url = f"{_CASTOR_BASE}/api/users/{user_id}/myfiles/upload"
    req = urllib.request.Request(
        url, data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary.decode()}",
            "Authorization": f"Bearer {jwt}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


# ─── Auth URL ────────────────────────────────────────────────────────────────

@router.get("/drive/auth-url")
def get_auth_url(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ("seafarer",):
        raise HTTPException(status_code=403)
    if not is_configured(db):
        return {"configured": False, "url": None}
    state = _make_state(str(current_user.id))
    return {"configured": True, "url": build_auth_url(state)}


# ─── OAuth Callback ──────────────────────────────────────────────────────────

@router.get("/drive/callback")
def oauth_callback(code: str = "", state: str = "", error: str = "", db: Session = Depends(get_db)):
    if error:
        return RedirectResponse(f"/app/#/settings?drive=error&reason={urllib.parse.quote(error)}")

    if not code or not state:
        return RedirectResponse("/app/#/settings?drive=error&reason=missing_params")

    try:
        user_id = _verify_state(state)
    except HTTPException:
        return RedirectResponse("/app/#/settings?drive=error&reason=csrf")

    try:
        tok = exchange_code(code, db)
        access_token  = tok.get("access_token", "")
        refresh_token = tok.get("refresh_token", "")
        if not refresh_token:
            return RedirectResponse("/app/#/settings?drive=error&reason=no_refresh_token")

        email = get_user_email(access_token)
        enc_rt = encrypt_token(refresh_token)
        now = datetime.now(timezone.utc)

        db.execute(text("""
            INSERT INTO drive_tokens (user_id, encrypted_rt, google_email, scope, connected_at)
            VALUES (:uid, :rt, :email, :scope, :now)
            ON CONFLICT (user_id) DO UPDATE
            SET encrypted_rt = :rt, google_email = :email, scope = :scope, connected_at = :now
        """), {
            "uid": user_id, "rt": enc_rt, "email": email,
            "scope": tok.get("scope", ""), "now": now,
        })
        db.commit()
    except Exception as exc:
        reason = urllib.parse.quote(str(exc)[:80])
        return RedirectResponse(f"/app/#/settings?drive=error&reason={reason}")

    return RedirectResponse("/app/#/settings?drive=connected")


# ─── Connection Status ───────────────────────────────────────────────────────

@router.get("/drive/status")
def drive_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _get_tokens(str(current_user.id), db)
    if not row:
        return {"connected": False, "email": None, "lastSyncAt": None, "configured": is_configured(db)}
    return {
        "connected": True,
        "email": row.google_email,
        "lastSyncAt": row.last_sync_at.isoformat() if row.last_sync_at else None,
        "configured": True,
    }


# ─── Revoke ──────────────────────────────────────────────────────────────────

@router.delete("/drive/revoke")
def drive_revoke(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _get_tokens(str(current_user.id), db)
    if row:
        try:
            revoke_token(decrypt_token(row.encrypted_rt))
        except Exception:
            pass
        db.execute(text("DELETE FROM drive_tokens WHERE user_id = :uid"), {"uid": str(current_user.id)})
        db.commit()
    return {"ok": True}


# ─── Backup to Drive ─────────────────────────────────────────────────────────

@router.post("/drive/backup")
def drive_backup(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ("seafarer",):
        raise HTTPException(status_code=403)

    svc = _build_service(str(current_user.id), db)

    # Fetch manifest (same data as export-zip)
    docs = db.execute(text("""
        SELECT saved_name, code_name, name, category, mime_type
        FROM documents
        WHERE seafarer_id = :sid AND saved_name IS NOT NULL
        ORDER BY category NULLS LAST, name
    """), {"sid": current_user.id}).fetchall()

    sf_row = db.execute(text("SELECT rank FROM seafarers WHERE id = :id"), {"id": current_user.id}).fetchone()
    rank  = sf_row.rank if sf_row else "Seafarer"
    fname = getattr(current_user, "first_name", None) or "Unknown"
    lname = getattr(current_user, "last_name", None) or ""

    safe = lambda s: "".join(c if c.isalnum() or c in "-_" else "_" for c in str(s))
    root_name = f"{safe(rank)}_{safe(fname)}_{safe(lname)}_Dossier"

    # Ensure root folder
    leto_folder = svc.ensure_folder("Leto Documents")
    root_folder = svc.ensure_folder(root_name, leto_folder)
    all_folder  = svc.ensure_folder("All Documents", root_folder)

    CAT_NAMES = {1: "Main Docs", 2: "IMO Courses", 3: "Health Certificates",
                 4: "Job Letters", 5: "Other Certificates"}

    # Own files, so a plain access token for this user (not an admin proxy)
    # satisfies Castor's guard (payload.sub === userId).
    own_token = create_access_token({"sub": str(current_user.id), "role": current_user.role})

    files_uploaded = 0
    for doc in docs:
        # Fetch physical file from castor
        encoded = urllib.parse.quote(doc.saved_name, safe="")
        url = f"{_CASTOR_BASE}/api/users/{current_user.id}/myfiles/download/{encoded}"
        try:
            req = urllib.request.Request(url, headers={"Authorization": f"Bearer {own_token}"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                file_bytes = resp.read()
        except Exception as exc:
            # Was `except Exception: continue` — a file silently missing from
            # the Drive backup with zero trace. Same silent-failure pattern
            # noted in company.py's _fetch_castor_file; never log `own_token`.
            status = getattr(exc, "code", None)
            print(f"[drive.drive_backup] fetch failed status={status} url={url} user_id={current_user.id}: {exc}", flush=True)
            continue

        name = doc.code_name or doc.name or doc.saved_name
        ext  = (doc.saved_name.rsplit(".", 1)[-1]) if "." in doc.saved_name else "pdf"
        file_name = f"{name}.{ext}"
        mime = doc.mime_type or "application/pdf"

        svc.upload_file(file_name, file_bytes, mime, all_folder)

        cat_name = CAT_NAMES.get(doc.category, "Other Certificates")
        cat_folder = svc.ensure_folder(cat_name, root_folder)
        svc.upload_file(file_name, file_bytes, mime, cat_folder)
        files_uploaded += 1

    # Update last_sync_at
    db.execute(text("UPDATE drive_tokens SET last_sync_at = :now WHERE user_id = :uid"),
               {"now": datetime.now(timezone.utc), "uid": str(current_user.id)})
    db.commit()

    return {"ok": True, "folderName": root_name, "filesUploaded": files_uploaded}


# ─── List Drive Files ─────────────────────────────────────────────────────────

@router.get("/drive/files")
def drive_files(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ("seafarer",):
        raise HTTPException(status_code=403)

    svc = _build_service(str(current_user.id), db)

    leto_folder = svc.find_folder("Leto Documents")
    if not leto_folder:
        return {"files": [], "folderExists": False}

    files = svc.list_files(leto_folder)
    return {"files": files, "folderExists": True}


# ─── Import from Drive ────────────────────────────────────────────────────────

class ImportPayload(BaseModel):
    file_id:        str = Field(max_length=200)
    file_name:      str = Field(max_length=255)
    doc_name:       str = Field(max_length=255)
    category:       int = 5
    category_label: str = "Other Certificates"
    mime_type:      str = "application/pdf"

    @field_validator("file_name", "doc_name", "category_label", "mime_type")
    @classmethod
    def _no_header_injection(cls, v):
        # Drop CR/LF/quotes: these are interpolated into multipart headers sent
        # to Castor, where a newline would inject extra headers.
        return re.sub(r'[\r\n"]', "", v)


@router.post("/drive/import")
def drive_import(
    payload: ImportPayload,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("seafarer",):
        raise HTTPException(status_code=403)

    svc = _build_service(str(current_user.id), db)

    # 1 — Download from Drive
    try:
        file_bytes = svc.download_file(payload.file_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Drive download failed: {exc}")

    # 2 — Re-upload to castor Express (so the physical file lives in the system)
    jwt = None
    try:
        jwt = create_access_token({"sub": str(current_user.id), "role": current_user.role})
    except Exception:
        pass

    if not jwt:
        raise HTTPException(status_code=500, detail="Cannot generate internal token for castor upload")

    try:
        express_resp = _upload_to_castor(
            user_id=str(current_user.id),
            file_bytes=file_bytes,
            filename=payload.file_name,
            doc_name=payload.doc_name,
            category=payload.category,
            category_label=payload.category_label,
            mime_type=payload.mime_type,
            jwt=jwt,
        )
    except Exception as exc:
        # Already surfaced to the client via the 502 below, but that response
        # body doesn't reach Cloud Run's own logs — print for server-side
        # visibility too. Never log `jwt`.
        status = getattr(exc, "code", None)
        print(f"[drive.drive_import] castor upload failed status={status} user_id={current_user.id}: {exc}", flush=True)
        raise HTTPException(status_code=502, detail=f"Castor upload failed: {exc}")

    saved_name = express_resp.get("savedName") or express_resp.get("saved_name")
    file_name  = express_resp.get("fileName")  or express_resp.get("file_name")
    file_size  = express_resp.get("fileSize")  or express_resp.get("file_size")

    # 3 — Sync metadata to FastAPI (reuse sync_document logic inline)
    from app.services.codename import build_codename
    import uuid as _uuid

    sf_row = db.execute(text("SELECT rank FROM seafarers WHERE id = :id"), {"id": current_user.id}).fetchone()
    rank = sf_row.rank if sf_row else None
    code_name = build_codename(
        doc_name=payload.doc_name, doc_key=payload.doc_name, cert_code=None,
        issuing_country=None, expiry_date=None,
        rank=rank, seafarer_code=getattr(current_user, "seafarer_code", None),
    )

    now = datetime.now(timezone.utc)
    existing = db.execute(text("""
        SELECT id FROM documents WHERE seafarer_id = :sid AND name = :name
    """), {"sid": current_user.id, "name": payload.doc_name}).fetchone()

    if existing:
        doc_id = existing.id
        db.execute(text("""
            UPDATE documents
            SET file_name=:fn, saved_name=:sn, file_size=:fs, mime_type=:mt,
                category=:cat, category_label=:cl, code_name=:cn,
                verification_status='pending', updated_at=:now
            WHERE id=:id
        """), {"fn": file_name, "sn": saved_name, "fs": file_size, "mt": payload.mime_type,
               "cat": payload.category, "cl": payload.category_label, "cn": code_name,
               "now": now, "id": doc_id})
    else:
        doc_id = str(_uuid.uuid4())
        db.execute(text("""
            INSERT INTO documents
                (id, seafarer_id, name, doc_key, code_name, file_name, saved_name,
                 file_size, mime_type, category, category_label,
                 verification_status, status, uploaded_at, updated_at)
            VALUES
                (:id, :sid, :name, :dk, :cn, :fn, :sn, :fs, :mt, :cat, :cl,
                 'pending', 'pending', :now, :now)
        """), {"id": doc_id, "sid": current_user.id, "name": payload.doc_name,
               "dk": payload.doc_name, "cn": code_name,
               "fn": file_name, "sn": saved_name, "fs": file_size, "mt": payload.mime_type,
               "cat": payload.category, "cl": payload.category_label, "now": now})
    db.commit()

    # 4 — Trigger OCR (Obj.3 pipeline)
    if saved_name:
        background_tasks.add_task(
            analyze_document_background,
            doc_id=doc_id,
            user_id=str(current_user.id),
            saved_name=saved_name,
            mime_type=payload.mime_type,
            doc_key=payload.doc_name,
        )

    return {"ok": True, "docId": doc_id, "savedName": saved_name}
