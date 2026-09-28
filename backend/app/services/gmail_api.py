"""
Gmail API sender — domain-wide delegation, no SDK, stdlib only
(urllib.request + json), same style as google_drive.py.

Google retired SMTP app passwords for Workspace on 2026-05-01 (the setting no
longer exists in the admin console, and Rick's account has no policy enabling
one) — SMTP is dead as an option. This replaces it with the Gmail API,
authenticated via a service account that has domain-wide delegation for
gmail.send, impersonating the real mailbox (castor@castor-app.com /
pollux@pollux-app.com) per product.

🔴 No service-account key file exists anywhere — not in the repo, not in
Secret Manager, not baked into a revision. The flow:

  1. Cloud Run already gives this container an identity (the runtime service
     account, castor-run@ / pollux-run@) via the metadata server — no key
     file, no env var, it's just there. `_runtime_access_token()` reads it.
  2. That identity calls IAM Credentials API's projects.serviceAccounts.signJwt
     on ITSELF, asking Google to sign a JWT assertion whose `sub` is the
     mailbox to impersonate. Google signs it server-side with a key this
     process never sees or downloads (`_sign_jwt()`).
  3. The signed JWT is exchanged for a real OAuth2 access token via the
     standard JWT-bearer grant (`_delegated_access_token()`) — domain-wide
     delegation makes that token authenticate AS the impersonated mailbox.
  4. That access token calls gmail.users.messages.send with the RFC822
     message, base64url-encoded (`send_message()`).

Requires, set up once outside this code (Workspace admin console + IAM):
  - Domain-wide delegation granted to the runtime SA's client ID, scoped to
    https://www.googleapis.com/auth/gmail.send, for the Workspace domain.
  - The runtime SA needs roles/iam.serviceAccountTokenCreator on ITSELF (to
    call signJwt on its own identity).

If the first real send gives 401 / unauthorized_client: wait. Delegation
propagation is documented by Google as "minutes, up to 24 hours" — that is
not a configuration error until it's still failing after real time has
passed.
"""
import base64
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from email.mime.text import MIMEText

_METADATA_TOKEN_URL = (
    "http://metadata.google.internal/computeMetadata/v1/"
    "instance/service-accounts/default/token"
)
_METADATA_EMAIL_URL = (
    "http://metadata.google.internal/computeMetadata/v1/"
    "instance/service-accounts/default/email"
)
_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.send"
_JWT_BEARER_GRANT = "urn:ietf:params:oauth:grant-type:jwt-bearer"


def _runtime_access_token() -> str:
    """The Cloud Run container's own identity. Only resolves on Cloud
    Run/GCE — the metadata server doesn't exist anywhere else, which is
    exactly the point: this can't accidentally run with a local credential."""
    req = urllib.request.Request(_METADATA_TOKEN_URL, headers={"Metadata-Flavor": "Google"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())["access_token"]


def _runtime_service_account_email() -> str:
    req = urllib.request.Request(_METADATA_EMAIL_URL, headers={"Metadata-Flavor": "Google"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.read().decode("utf-8").strip()


def _sign_jwt(sa_email: str, claims: dict, runtime_token: str) -> str:
    """IAM Credentials API signs on Google's side — the private key never
    leaves Google's infrastructure and this process never holds it."""
    url = f"https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/{sa_email}:signJwt"
    body = json.dumps({"payload": json.dumps(claims)}).encode("utf-8")
    req = urllib.request.Request(
        url, data=body, method="POST",
        headers={"Authorization": f"Bearer {runtime_token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())["signedJwt"]


def _delegated_access_token(impersonate: str) -> str:
    """Sign a JWT asserting sub=impersonate (domain-wide delegation lets the
    runtime SA act as any mailbox in the Workspace domain for the granted
    scope), trade it for a real OAuth2 access token that IS that mailbox."""
    runtime_token = _runtime_access_token()
    sa_email = _runtime_service_account_email()
    now = int(time.time())
    claims = {
        "iss": sa_email,
        "sub": impersonate,
        "scope": _GMAIL_SCOPE,
        "aud": _OAUTH_TOKEN_URL,
        "iat": now,
        "exp": now + 3600,
    }
    signed_jwt = _sign_jwt(sa_email, claims, runtime_token)

    body = urllib.parse.urlencode({"grant_type": _JWT_BEARER_GRANT, "assertion": signed_jwt}).encode()
    req = urllib.request.Request(_OAUTH_TOKEN_URL, data=body, method="POST")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())["access_token"]


def send_message(*, from_addr: str, to_addr: str, subject: str, body_text: str) -> None:
    """Send a plain-text email as `from_addr` via Gmail API + domain-wide
    delegation. Raises on any failure — this module doesn't decide what
    "failure must not look like success" means for the caller; that's
    email_sender.py's job (it must catch this and log the reason, never
    swallow it silently)."""
    access_token = _delegated_access_token(from_addr)

    msg = MIMEText(body_text)
    msg["to"] = to_addr
    msg["from"] = from_addr
    msg["subject"] = subject
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")

    url = f"https://gmail.googleapis.com/gmail/v1/users/{urllib.parse.quote(from_addr)}/messages/send"
    req = urllib.request.Request(
        url, data=json.dumps({"raw": raw}).encode("utf-8"), method="POST",
        headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        json.loads(resp.read())
