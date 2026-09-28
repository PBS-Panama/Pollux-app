from contextlib import asynccontextmanager
import threading
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.session import engine
from app.db.migrate import schema_status, upgrade_to_head
from app.db.seeds import run_seeds
from app.routers import auth, documents, compliance, seafarers, company, users
from app.routers import admin as admin_router
from app.routers import learning as learning_router
from app.routers import exams as exams_router
from app.routers import drive as drive_router
from app.routers import embarkations as embarkations_router
from app.routers import notifications as notifications_router


def _db_startup():
    """Bootstrap the database in a background thread (uvicorn binds first).

    The schema is owned by Alembic (backend/alembic/). This function never runs
    DDL itself:
      1. AUTO_MIGRATE=true  → `alembic upgrade head` (docker-compose dev only).
      2. Verify the DB is at the expected revision; complain loudly if not.
      3. Run the idempotent data seeds (app/db/seeds.py).
    In production the migration is a deploy step (Cloud Run Job), so a cold
    start with several instances never issues concurrent DDL (PM review C4).
    """
    for _attempt in range(12):
        try:
            if settings.AUTO_MIGRATE:
                print("[leto-api] AUTO_MIGRATE=true → alembic upgrade head", flush=True)
                upgrade_to_head()

            current, head, is_current = schema_status(engine)
            if is_current:
                print(f"[leto-api] schema OK — revision {current}", flush=True)
            elif current is None:
                raise RuntimeError(
                    "database has no alembic_version table — run `alembic upgrade head` "
                    "(or set AUTO_MIGRATE=true in dev) before starting the app"
                )
            else:
                print(
                    f"[leto-api] !!! SCHEMA MISMATCH: database={current} code expects={head}. "
                    "Run `alembic upgrade head` as a deploy step. The app will NOT alter the schema.",
                    flush=True,
                )

            run_seeds(engine)
            print("[leto-api] DB startup complete", flush=True)
            return
        except Exception as _e:
            print(f"[leto-api] DB startup attempt {_attempt+1}/12 failed: {_e}", flush=True)
            if _attempt < 11:
                time.sleep(5)
    print("[leto-api] DB startup failed after 12 attempts", flush=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    threading.Thread(target=_db_startup, daemon=True).start()
    yield  # uvicorn binds port 8000 here; migrations run concurrently


app = FastAPI(
    title="Leto API",
    description="Maritime Talent Platform — PBS Ecosystem",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Origins come from CORS_ORIGINS (comma-separated). Never use ["*"] here:
# allow_credentials=True + "*" is rejected by browsers for credentialed requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting (2026-09-14) — see core/rate_limit.py for why the IP key
# reads X-Forwarded-For instead of request.client.host.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(documents.router, prefix="/api", tags=["Documents"])
app.include_router(compliance.router, prefix="/api", tags=["Compliance"])
app.include_router(seafarers.router, prefix="/api", tags=["Seafarers"])
app.include_router(company.router, prefix="/api", tags=["Company"])
app.include_router(users.router, prefix="/api", tags=["Users"])
app.include_router(admin_router.router, prefix="/api/admin", tags=["Admin"])
app.include_router(learning_router.router, prefix="/api", tags=["Learning"])
app.include_router(exams_router.router, prefix="/api", tags=["Exams"])
app.include_router(drive_router.router, prefix="/api", tags=["Drive"])
app.include_router(embarkations_router.router, prefix="/api", tags=["Embarkations"])
app.include_router(notifications_router.router, prefix="/api", tags=["Notifications"])


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "leto-api", "version": "0.1.0"}
