from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import analyze, batch, history
from app.core.config import settings
from app.core.security import RateLimitMiddleware
from app.db.database import create_tables
from app.models.detector import detector
from app.models.gradcam import init_gradcam
from app.models.schemas import HealthResponse


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await create_tables()
    init_gradcam(detector.get_model())
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=(
        "Upload any image and determine if it's real or AI-generated, "
        "with Grad-CAM heatmap visualization."
    ),
    lifespan=lifespan,
)

# Sliding-window rate limiter (no external deps)
app.add_middleware(
    RateLimitMiddleware,
    limit=settings.rate_limit_per_minute,
    window_seconds=60,
    paths=("/api/analyze", "/api/batch"),
)

# CORS — must be added LAST to be the outermost middleware!
# This ensures CORS headers are attached to 429 errors from the rate limiter
# and also correctly intercepts OPTIONS preflight requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api", tags=["Detection"])
app.include_router(batch.router, prefix="/api", tags=["Detection"])
app.include_router(history.router, prefix="/api", tags=["History"])


@app.get("/api/health", response_model=HealthResponse, tags=["System"])
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        model_loaded=not settings.use_mock_model,
        version=settings.version,
    )
