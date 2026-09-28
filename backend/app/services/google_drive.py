"""
Google Drive REST API wrapper — no SDK, stdlib only (urllib.request + json).

Usage:
    svc = DriveService(access_token, refresh_token, client_id, client_secret)
    folder_id = svc.ensure_folder("Leto Documents")
    file_id   = svc.upload_file("Master_CoC_PA.pdf", bytes_data, "application/pdf", folder_id)

Token refresh is transparent: if a request gets a 401 the service refreshes the
access token once and retries. The caller is responsible for persisting the new
access token if they want to cache it.
"""

import io
import json
import os
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Optional

_TOKEN_URL     = "https://oauth2.googleapis.com/token"
_REVOKE_URL    = "https://oauth2.googleapis.com/revoke"
_USERINFO_URL  = "https://www.googleapis.com/oauth2/v2/userinfo"
_DRIVE_BASE    = "https://www.googleapis.com/drive/v3"
_UPLOAD_BASE   = "https://www.googleapis.com/upload/drive/v3"
_AUTH_BASE     = "https://accounts.google.com/o/oauth2/v2/auth"
_SCOPE         = "https://www.googleapis.com/auth/drive.file"

# ─── Config helpers ─────────────────────────────────────────────────────────

def get_client_id()     -> str: return os.environ.get("GOOGLE_DRIVE_CLIENT_ID", "")
def get_client_secret() -> str: return os.environ.get("GOOGLE_DRIVE_CLIENT_SECRET", "")
def get_redirect_uri()  -> str:
    return os.environ.get("GOOGLE_DRIVE_REDIRECT_URI", "http://localhost:4000/api/drive/callback")

def is_configured() -> bool:
    return bool(get_client_id() and get_client_secret())


# ─── OAuth helpers (no DriveService instance needed) ─────────────────────────

def build_auth_url(state: str) -> str:
    params = {
        "client_id":     get_client_id(),
        "redirect_uri":  get_redirect_uri(),
        "response_type": "code",
        "scope":         _SCOPE,
        "access_type":   "offline",
        "prompt":        "consent",
        "state":         state,
    }
    return _AUTH_BASE + "?" + urllib.parse.urlencode(params)


def exchange_code(code: str) -> dict:
    """Exchange authorization code for access + refresh tokens. Returns raw token response."""
    body = urllib.parse.urlencode({
        "code":          code,
        "client_id":     get_client_id(),
        "client_secret": get_client_secret(),
        "redirect_uri":  get_redirect_uri(),
        "grant_type":    "authorization_code",
    }).encode()
    req = urllib.request.Request(_TOKEN_URL, data=body, method="POST")
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read())


def refresh_access_token(refresh_token: str) -> dict:
    """Get a new access token using a stored refresh token."""
    body = urllib.parse.urlencode({
        "refresh_token": refresh_token,
        "client_id":     get_client_id(),
        "client_secret": get_client_secret(),
        "grant_type":    "refresh_token",
    }).encode()
    req = urllib.request.Request(_TOKEN_URL, data=body, method="POST")
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read())


def get_user_email(access_token: str) -> str:
    req = urllib.request.Request(_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read())
    return data.get("email", "")


def revoke_token(token: str) -> None:
    """Revoke a refresh or access token."""
    url = _REVOKE_URL + "?" + urllib.parse.urlencode({"token": token})
    req = urllib.request.Request(url, method="POST")
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception:
        pass  # best-effort revocation


# ─── DriveService ────────────────────────────────────────────────────────────

class DriveService:
    """Thin wrapper around Drive v3 REST API. Handles transparent token refresh."""

    def __init__(self, access_token: str, refresh_token: str):
        self._at  = access_token
        self._rt  = refresh_token
        self._new_at: Optional[str] = None  # set when token is refreshed

    @property
    def current_access_token(self) -> str:
        return self._new_at or self._at

    def _req(self, method: str, url: str, *, data=None, headers: dict | None = None,
             json_body=None, retry: bool = True) -> dict | bytes:
        hdrs = {"Authorization": f"Bearer {self.current_access_token}"}
        if headers:
            hdrs.update(headers)
        if json_body is not None:
            data = json.dumps(json_body).encode("utf-8")
            hdrs["Content-Type"] = "application/json"

        req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                ct = resp.headers.get("Content-Type", "")
                raw = resp.read()
                if "application/json" in ct:
                    return json.loads(raw)
                return raw
        except urllib.error.HTTPError as exc:
            if exc.code == 401 and retry and self._rt:
                tok = refresh_access_token(self._rt)
                self._new_at = tok["access_token"]
                return self._req(method, url, data=data, headers=headers,
                                 json_body=None, retry=False)
            raise

    # ── Folder operations ────────────────────────────────────────────────

    def find_folder(self, name: str, parent_id: Optional[str] = None) -> Optional[str]:
        q = f"name='{name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        if parent_id:
            q += f" and '{parent_id}' in parents"
        params = urllib.parse.urlencode({"q": q, "fields": "files(id,name)", "spaces": "drive"})
        result = self._req("GET", f"{_DRIVE_BASE}/files?{params}")
        files = result.get("files", [])  # type: ignore[union-attr]
        return files[0]["id"] if files else None

    def create_folder(self, name: str, parent_id: Optional[str] = None) -> str:
        meta: dict = {"name": name, "mimeType": "application/vnd.google-apps.folder"}
        if parent_id:
            meta["parents"] = [parent_id]
        result = self._req("POST", f"{_DRIVE_BASE}/files", json_body=meta)
        return result["id"]  # type: ignore[index]

    def ensure_folder(self, name: str, parent_id: Optional[str] = None) -> str:
        """Return existing folder ID or create it."""
        existing = self.find_folder(name, parent_id)
        return existing if existing else self.create_folder(name, parent_id)

    # ── File operations ──────────────────────────────────────────────────

    def upload_file(self, name: str, content: bytes, mime_type: str, folder_id: str) -> str:
        """Multipart upload. Returns Drive file ID."""
        boundary = b"Leto_Boundary_7f3a2b9c"
        meta_json = json.dumps({"name": name, "parents": [folder_id]}).encode("utf-8")
        body = (
            b"--" + boundary + b"\r\n"
            b"Content-Type: application/json; charset=UTF-8\r\n\r\n" + meta_json + b"\r\n"
            b"--" + boundary + b"\r\n"
            + f"Content-Type: {mime_type}\r\n\r\n".encode() + content + b"\r\n"
            b"--" + boundary + b"--\r\n"
        )
        result = self._req(
            "POST",
            f"{_UPLOAD_BASE}/files?uploadType=multipart&fields=id",
            data=body,
            headers={"Content-Type": f"multipart/related; boundary={boundary.decode()}"},
        )
        return result["id"]  # type: ignore[index]

    def list_files(self, folder_id: str, max_results: int = 50) -> list:
        q = f"'{folder_id}' in parents and trashed=false"
        params = urllib.parse.urlencode({
            "q": q,
            "fields": "files(id,name,mimeType,size,modifiedTime)",
            "pageSize": max_results,
        })
        result = self._req("GET", f"{_DRIVE_BASE}/files?{params}")
        return result.get("files", [])  # type: ignore[union-attr]

    def download_file(self, file_id: str) -> bytes:
        return self._req("GET", f"{_DRIVE_BASE}/files/{file_id}?alt=media")  # type: ignore[return-value]
