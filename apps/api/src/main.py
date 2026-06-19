"""
Career Intelligence Studio — FastAPI Application Entry Point

Responsibilities of this file (and ONLY this file):
  - Application construction and lifespan management
  - Middleware registration (CORS, headers)
  - Router registration
  - OpenTelemetry instrumentation
  - Health check endpoint

All route handlers, schemas, and business logic live in apps/api/src/routers/.
"""
import logging

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apps.api.src.config import settings
from apps.api.src.utils.ai_client import ai_gateway_client, nvidia_api_key_ctx, ai_gateway_mode_ctx

# Routers
from apps.api.src.routers.documents import router as documents_router
from apps.api.src.routers.jd import router as jd_router
from apps.api.src.routers.resume import router as resume_router
from apps.api.src.routers.ats import router as ats_router
from apps.api.src.routers.interview import router as interview_router
from apps.api.src.routers.applications import router as applications_router
from apps.api.src.routers.cover_letter import router as cover_letter_router
from apps.api.src.routers.evidence import router as evidence_router
from apps.api.src.routers.orchestration import router as orchestration_router
from apps.api.src.routers.app_settings import router as app_settings_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cis-api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown: create DB tables, close httpx client."""
    # Create DB tables on startup
    from apps.api.src.database import engine, Base
    from apps.api.src import models  # noqa: F401 — registers all models with Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables verified/created.")

    yield

    # Cleanup httpx client on shutdown
    await ai_gateway_client.close()
    logger.info("AI Gateway client closed.")


app = FastAPI(
    title="Career Intelligence Studio (CIS) API",
    description=(
        "Production-grade API for CV optimization, JD analysis, "
        "ATS scoring, and interview preparation."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# --- Middleware ---

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def extract_nvidia_headers(request, call_next):
    """Propagates per-request NVIDIA credentials via context vars."""
    api_key = request.headers.get("x-nvidia-api-key", "")
    mode = request.headers.get("x-ai-gateway-mode", "")
    token_key = nvidia_api_key_ctx.set(api_key)
    token_mode = ai_gateway_mode_ctx.set(mode)
    try:
        return await call_next(request)
    finally:
        nvidia_api_key_ctx.reset(token_key)
        ai_gateway_mode_ctx.reset(token_mode)


# --- OpenTelemetry (optional) ---

try:
    from opentelemetry import trace
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    tracer = trace.get_tracer("cis-tracer")
    FastAPIInstrumentor.instrument_app(app)
    logger.info("OpenTelemetry instrumentation enabled.")
except ImportError:
    logger.warning("OpenTelemetry not installed — running without auto-instrumentation.")

# --- Register Routers ---

app.include_router(documents_router)
app.include_router(jd_router)
app.include_router(resume_router)
app.include_router(ats_router)
app.include_router(interview_router)
app.include_router(applications_router)
app.include_router(cover_letter_router)
app.include_router(evidence_router)
app.include_router(orchestration_router)
app.include_router(app_settings_router)


# --- Health Check ---

@app.get("/", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": "Career Intelligence Studio API", "version": "1.0.0"}
