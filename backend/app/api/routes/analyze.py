from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.config import settings
from app.models.schemas import AnalysisResult
from app.services.analysis_service import run_analysis

router = APIRouter()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post(
    "/analyze", response_model=AnalysisResult, summary="Analyze a single image"
)
async def analyze_image(
    file: UploadFile = File(..., description="JPEG, PNG, or WebP image (max 10 MB)"),
    db: AsyncSession = Depends(get_db),
) -> AnalysisResult:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type '{file.content_type}'. Upload JPEG, PNG, or WebP.",
        )

    raw_bytes = await file.read()

    if len(raw_bytes) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum size of {settings.max_upload_size_mb} MB.",
        )

    try:
        result = await run_analysis(
            file_bytes=raw_bytes,
            filename=file.filename or "upload",
            db=db,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return result
