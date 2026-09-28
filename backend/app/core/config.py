from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings

_INSECURE_SECRET_KEYS = {"change-me", "changeme", "secret", ""}
_MIN_SECRET_KEY_LEN = 32


class Settings(BaseSettings):
    # No default with a real password — must come from .env locally (gitignored)
    # or the Cloud Run env var in production. Pydantic raises at startup if it's
    # missing from both, same fail-fast behavior as DRIVE_TOKEN_SECRET
    # (app/services/token_crypto.py).
    DATABASE_URL: str
    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ENVIRONMENT: str = "development"

    # Comma-separated list of allowed browser origins (scheme + host [+ port]).
    # Dev default covers the Vite/CRA dev servers; behind nginx (same origin) CORS
    # is not exercised. In production this MUST be set explicitly, e.g.
    #   CORS_ORIGINS=https://castor-app.com,https://www.castor-app.com
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Base URL this backend uses to call Castor's Express server directly
    # (seafarer file storage + a few cross-app lookups — admin's document
    # viewer, company.py's seafarer proxy, drive.py, doc_analyzer.py). Before
    # the 2026-09-03 physical split, Castor ("castor") was a sibling service
    # in this same docker-compose.yml; post-split it's a separate stack/
    # deployment, so this can no longer be a hardcoded literal. Dev default
    # matches the local docker-compose service name (works once both stacks
    # join the shared `pbs-cross-app` network — see docker-compose.yml).
    # Production MUST set this to Castor's real public URL, e.g.
    #   CASTOR_BASE_URL=https://www.castor-app.com
    CASTOR_BASE_URL: str = "http://castor:8080"

    # Schema / data bootstrap (C4). Schema is owned by Alembic (backend/alembic/).
    #   AUTO_MIGRATE   — run `alembic upgrade head` at startup. Dev convenience only;
    #                    production runs the migration as a deploy step (Cloud Run Job).
    #   SEED_DEMO_DATA — seed demo.company@pollux.com (the platform's only demo
    #                    company account). The only demo seafarer account is
    #                    demo@castor.com, seeded by pbsds-castor-app against the
    #                    same shared DB — Pollux does not seed its own. Unset →
    #                    enabled everywhere EXCEPT production.
    #   ADMIN_SEED_PASSWORD — password for the seeded admin (ADMIN_SEED_EMAIL). Read
    #                    directly by seed_admin() (app/db/seeds.py), no fallback in
    #                    any environment — unset means "don't touch the password",
    #                    not "use a dev default" (see that function's docstring for
    #                    why: a property-based fallback is what caused L-7 below).
    AUTO_MIGRATE: bool = False
    SEED_DEMO_DATA: bool | None = None
    # 2026-09-14 (Handover.md nota (46), L-7): was "ricardo@pbs.com" — a production
    # row with that email and the dev-fallback password "admins123" (previously
    # returned by an admin_seed_password property with a silent non-production
    # fallback — removed, see seed_admin()) was found live against leto-postgres.
    # Renamed to the real Pollux mailbox Rick created; seed_admin() also
    # neutralizes/removes the old ricardo@pbs.com row on startup so the new email
    # doesn't just add a second admin next to a still-working one.
    ADMIN_SEED_EMAIL: str = "pollux@pollux-app.com"
    ADMIN_SEED_PASSWORD: str | None = None

    # Company approval (Rick, 2026-09-14) — email verification links point back
    # at this app's own public origin (nginx routes /api/ to this backend).
    FRONTEND_URL: str = "http://localhost:4001"
    # Which EmailSender implementation to use (app/services/email_sender.py).
    # "logger" (default) only logs — safe until Rick picks a real provider.
    # "gmail_api" (2026-09-14) sends real mail via Gmail API + domain-wide
    # delegation — Google retired SMTP app passwords for Workspace on
    # 2026-05-01, so that plan is dead; see email_sender.py/gmail_api.py.
    EMAIL_PROVIDER: str = "logger"
    # Mailbox EMAIL_PROVIDER=gmail_api sends as (and delegation is scoped to).
    # Pollux mails from its own address, Castor from its own — never mix.
    EMAIL_FROM: str = "pollux@pollux-app.com"

    # Embarkation verification (E-1, orden de la nota 63) — durable storage for
    # embarkation_contact_log's PDF attachments. Same bucket Castor's Node
    # layer already uses for seafarer documents (castor-app-506901-uploads,
    # a bucket in castor-app-506901 — a DIFFERENT GCP project than this
    # service's own pollux-app-507503), different prefix — see
    # app/services/embarkation_storage.py for why this is direct-from-Python
    # and not proxied through Node. UNVERIFIED for this product: the admin
    # panel that will actually call the upload endpoint lives in Pollux, so
    # it's pollux-run@ (not castor-run@) that needs IAM on this bucket in
    # production — only tested so far from castor-run@'s own project. See
    # Handover.md for the note flagging this.
    EMBARKATION_GCS_BUCKET: str = "castor-app-506901-uploads"

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() in {"production", "prod"}

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def seed_demo_data(self) -> bool:
        return (not self.is_production) if self.SEED_DEMO_DATA is None else self.SEED_DEMO_DATA

    @model_validator(mode="after")
    def _fail_fast_in_production(self) -> "Settings":
        """Refuse to boot in production with dev-only defaults.

        A default SECRET_KEY means any client can forge JWTs; a localhost-only
        CORS list means the real domain cannot call the API at all. Both are
        silent failures at runtime, so we make them loud at startup instead.
        """
        if not self.is_production:
            return self

        problems: list[str] = []
        if self.SECRET_KEY.strip().lower() in _INSECURE_SECRET_KEYS:
            problems.append("SECRET_KEY is unset or uses the insecure default")
        elif len(self.SECRET_KEY) < _MIN_SECRET_KEY_LEN:
            problems.append(
                f"SECRET_KEY is too short ({len(self.SECRET_KEY)} chars, "
                f"minimum {_MIN_SECRET_KEY_LEN})"
            )
        if not self.cors_origins or all("localhost" in o or "127.0.0.1" in o for o in self.cors_origins):
            problems.append("CORS_ORIGINS must list the public origin(s) — only localhost entries found")
        if "@postgres:5432" in self.DATABASE_URL:
            problems.append("DATABASE_URL still points at the docker-compose dev database")
        if self.CASTOR_BASE_URL.strip().rstrip("/") == "http://castor:8080":
            problems.append(
                "CASTOR_BASE_URL still points at the docker-compose dev hostname "
                "(http://castor:8080) — set it to Castor's real public URL"
            )
        if "localhost" in self.FRONTEND_URL or "127.0.0.1" in self.FRONTEND_URL:
            problems.append(
                "FRONTEND_URL still points at a dev default — the email-verification "
                "link auth.py builds from it would point at localhost. A verification "
                "email with a localhost link is worse than not sending one."
            )
        # NOTE for whoever redeploys pb-pollux or pb-castor next (2026-09-14):
        # the FRONTEND_URL check above is NEW, and as of today NEITHER live
        # service has FRONTEND_URL set (confirmed with `gcloud run services
        # describe ... env[].name` on both — absent, not just empty). Set
        # FRONTEND_URL on the Cloud Run service BEFORE the next deploy of
        # either, or the container refuses to start — same failure mode as a
        # missing SECRET_KEY/CORS_ORIGINS/CASTOR_BASE_URL.

        if problems:
            raise RuntimeError(
                "Refusing to start with ENVIRONMENT=production: "
                + "; ".join(problems)
                + ". Set the env vars on the Cloud Run service (never in committed files)."
            )
        return self


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
