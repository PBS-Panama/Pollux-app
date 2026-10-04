"""The one place that downloads a seafarer's file from Castor's storage.

Before T18 this was copy-pasted in routers/admin.py (document viewer proxy),
routers/company.py (ZIP export) and services/doc_analyzer.py (OCR pipeline).

The caller names itself in `service`: the token carries an explicit service
marker (`svc: true`), not a disguised admin user (Rick/Castor, 2026-09-14). A
`role: "admin"` token made the proxy indistinguishable from a real admin, and a
leaked admin JWT would have granted file access it was never meant to. Castor's
guard accepts `svc: true` additively alongside `role === 'admin'`.
"""
import logging
import urllib.parse
import urllib.request

from app.core.config import settings
from app.core.security import create_access_token

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT_S = 15
GENERIC_ERROR = "Could not fetch file from storage"


class CastorFetchError(Exception):
    """Generic on purpose: str() is safe to show a client. The URL, status and
    cause go to the server log only (never the token)."""

    def __init__(self) -> None:
        super().__init__(GENERIC_ERROR)


def fetch_castor_file(
    user_id: str, saved_name: str, *, service: str, timeout: float = DEFAULT_TIMEOUT_S,
) -> tuple[bytes, str]:
    """Return (content, content_type). Raises CastorFetchError after logging why."""
    encoded = urllib.parse.quote(saved_name, safe="")
    url = f"{settings.CASTOR_BASE_URL}/api/users/{user_id}/myfiles/download/{encoded}"
    try:
        token = create_access_token({"sub": service, "svc": True})
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read(), resp.headers.get("Content-Type", "application/octet-stream")
    except Exception as exc:
        # A silent failure here once hid a routing bug for weeks (2026-09-13
        # postmortem), and a SECRET_KEY mismatch between the two services looks
        # identical — so always leave a trace in Cloud Run's logs.
        logger.error(
            "castor fetch failed service=%s status=%s url=%s: %s",
            service, getattr(exc, "code", None), url, exc,
        )
        raise CastorFetchError() from exc
