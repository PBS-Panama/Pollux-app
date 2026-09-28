"""Durable storage for embarkation verification attachments (E-1, Task 2 —
Rick, nota 63, "el riesgo real del hito").

The only upload path that exists elsewhere in this codebase
(POST /admin/ocr-references/{doc_key}, admin.py) writes to
_OCR_REF_DIR = pathlib.Path("/app/ocr_references") — the container's own
disk. On Cloud Run that is ephemeral: it is gone on the next deploy. Do NOT
copy that pattern here. embarkation_contact_log.attachment_ref is the PDF
that backs a claim Castor makes to a shipping company (their silence, a
mismatch with what the seafarer said); losing it on a routine deploy would
be the worst failure mode this whole verification model has.

Decision: GCS **direct from this Python backend**, not proxied through
Castor's Node/Express layer (the other option Rick offered — his call to
make). Two reasons:
  1. This attachment belongs to an admin's outreach effort, not to the
     seafarer's own document locker. Routing it through
     /api/users/{id}/myfiles/... would misrepresent whose file it is, and
     would need a brand-new upload endpoint on the Node ("castor") side —
     interface surface E-1 is explicitly not supposed to touch this hito
     ("SIN UI").
  2. google-cloud-storage is the standard, actively-maintained GCP SDK, and
     Cloud Run already hands this service (castor-run@, same SA the Cloud
     SQL connection uses) Application Default Credentials for free — no new
     secret, no new IAM grant, confirmed against the real bucket (see the
     Handover note for this task for the actual verification run).

Same bucket Castor's Node layer already uses for seafarer files
(castor-app-506901-uploads, see docker-compose.cloud.yml), a different
prefix (embarkation-attachments/) so the two storage domains never collide
or need coordinating.

The ref stored in attachment_ref is the GCS blob path (a string), never a
signed or public URL — those expire or leak. Resolve it back to bytes with
read_attachment() when an admin needs to view the PDF.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from google.api_core.exceptions import NotFound
from google.cloud import storage

from app.core.config import settings

_PREFIX = "embarkation-attachments"

_client: storage.Client | None = None


def _get_client() -> storage.Client:
    global _client
    if _client is None:
        _client = storage.Client()
    return _client


def _bucket() -> storage.Bucket:
    return _get_client().bucket(settings.EMBARKATION_GCS_BUCKET)


def store_attachment(content: bytes, filename: str, content_type: str = "application/pdf") -> str:
    """Upload one contact-log attachment. Returns the opaque ref to persist
    in embarkation_contact_log.attachment_ref."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    blob_path = f"{_PREFIX}/{datetime.now(timezone.utc):%Y/%m}/{uuid.uuid4()}.{ext}"
    blob = _bucket().blob(blob_path)
    blob.upload_from_string(content, content_type=content_type)
    return blob_path


def read_attachment(ref: str) -> bytes:
    """Read back an attachment by the ref store_attachment() returned.
    Raises FileNotFoundError (not the GCS-specific exception type) so
    callers don't need to import google.api_core to handle a missing file."""
    try:
        return _bucket().blob(ref).download_as_bytes()
    except NotFound:
        raise FileNotFoundError(f"embarkation attachment not found: {ref}")


def attachment_exists(ref: str) -> bool:
    return _bucket().blob(ref).exists()
