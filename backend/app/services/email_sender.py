"""
Company approval (Rick, 2026-09-14) — email sending behind a small port.
Selected via EMAIL_PROVIDER (config.py):
  "logger"    (default) — only logs, never blocks the flow, zero setup.
  "gmail_api" (2026-09-14) — real mail via Gmail API + domain-wide delegation.
              SMTP app passwords are not an option (Google retired them for
              Workspace 2026-05-01); see gmail_api.py for the how.

To add another provider later: implement EmailSender, register it in
get_email_sender(), point EMAIL_PROVIDER at it. Nothing else in the codebase
should change — callers only ever see the EmailSender interface.
"""
from abc import ABC, abstractmethod

from app.core.config import settings
from app.services import gmail_api


class EmailSender(ABC):
    @abstractmethod
    def send(self, to: str, template: str, context: dict) -> None:
        """Send `template` to `to` with `context`. Must not raise on delivery
        failure — the caller's flow (e.g. registration) does not depend on
        the send succeeding synchronously."""
        raise NotImplementedError


class LoggingEmailSender(EmailSender):
    """Default adapter. Logs the email instead of sending it — lets the
    verification flow be tested end-to-end (read the URL from the log,
    paste it in a browser) with zero provider setup.

    Uses print(flush=True), not the `logging` module — nothing else in this
    codebase configures logging (no basicConfig, no other getLogger() call:
    grep app/ before assuming otherwise), so a bare logger.info() is silently
    dropped by the default WARNING root level and never reaches
    `docker compose logs` / Cloud Run's log viewer. print() is what
    `[leto-api] schema OK` and every other startup message already use.
    """

    def send(self, to: str, template: str, context: dict) -> None:
        print(f"[email:{template}] to={to} context={context}", flush=True)


_BRAND_BY_SENDER = {
    "castor@castor-app.com": "Castor",
    "pollux@pollux-app.com": "Pollux",
}

# One entry per template actually used (grep app/routers/ for
# get_email_sender().send before assuming there are more) — each renders
# (subject, body) from the same context dict the caller already builds.
_TEMPLATES = {
    "verify_email": lambda brand, ctx: (
        f"Verificá tu correo — {brand}",
        "Confirmá tu cuenta haciendo clic en este enlace (vence en "
        f"{ctx.get('expires_hours', 48)} horas):\n\n{ctx['verify_url']}\n\n"
        "Si no creaste esta cuenta, podés ignorar este correo.",
    ),
    "reset_password": lambda brand, ctx: (
        f"Recuperá tu contraseña — {brand}",
        "Alguien (con suerte vos) pidió restablecer la contraseña de tu cuenta. "
        "Hacé clic en este enlace para elegir una nueva "
        f"(vence en {ctx.get('expires_hours', 1)} hora"
        f"{'s' if ctx.get('expires_hours', 1) != 1 else ''}):\n\n{ctx['reset_url']}\n\n"
        "Si no lo pediste vos, podés ignorar este correo — tu contraseña actual sigue funcionando.",
    ),
}


class GmailApiEmailSender(EmailSender):
    """Real email via Gmail API + domain-wide delegation (2026-09-14 —
    Google retired SMTP app passwords for Workspace on 2026-05-01, so that
    plan is dead; see app/services/gmail_api.py for the how and why). Sends
    as settings.EMAIL_FROM, which is per-product (castor@castor-app.com /
    pollux@pollux-app.com) — never hardcode a mailbox here.
    """

    def send(self, to: str, template: str, context: dict) -> None:
        render = _TEMPLATES.get(template)
        if render is None:
            # Same principle as everything else logged this session: a
            # provider that silently does nothing for an unknown template is
            # a failure that looks like success. Say so.
            print(f"[email:{template}] FAILED to={to} reason=no gmail_api template registered", flush=True)
            return

        from_addr = settings.EMAIL_FROM
        brand = _BRAND_BY_SENDER.get(from_addr, from_addr)
        subject, body = render(brand, context)
        try:
            gmail_api.send_message(from_addr=from_addr, to_addr=to, subject=subject, body_text=body)
            print(f"[email:{template}] sent to={to} from={from_addr} via gmail_api", flush=True)
        except Exception as exc:
            # A send failure must never look like a send success — that's
            # the same guardrail L-4/L-5/L-7 applied to OCR and the admin
            # seed, applied here. Never raise (callers don't handle it — see
            # the ABC docstring above), but never go quiet either.
            print(f"[email:{template}] FAILED to={to} from={from_addr} reason={exc}", flush=True)


def get_email_sender() -> EmailSender:
    provider = (settings.EMAIL_PROVIDER or "logger").strip().lower()
    if provider == "logger":
        return LoggingEmailSender()
    if provider == "gmail_api":
        return GmailApiEmailSender()
    raise NotImplementedError(
        f"EMAIL_PROVIDER={provider!r} has no EmailSender implementation yet — "
        "add one and register it here before setting this env var."
    )
