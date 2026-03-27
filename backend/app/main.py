from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine
from app.db.base import Base
from app.routers import auth, documents

# Create all tables on startup (dev mode — use Alembic in production)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Leto API",
    description="Maritime Talent Platform — PBS Ecosystem",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(documents.router, prefix="/api", tags=["Documents"])


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "leto-api", "version": "0.1.0"}
