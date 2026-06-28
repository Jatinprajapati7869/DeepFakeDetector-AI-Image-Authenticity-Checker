import asyncio
import time
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.config import settings
from app.models.schemas import BatchResponse, BatchResultItem
from app.services.analysis_service import run_analysis

router = APIRouter()

MAX_BATCH_SIZE = 10
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


async def _analyze_one(file: UploadFile, db: AsyncSession) -> BatchResultItem:
    try:
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            return BatchResultItem(
                filename=file.filename or "upload",
                error=f"Unsupported type: {file.content_type}",
            )

        raw_bytes = await file.read()

        if len(raw_bytes) > settings.max_upload_size_bytes:
            return BatchResultItem(
                filename=file.filename or "upload",
                error=f"File exceeds {settings.max_upload_size_mb} MB limit.",
            )

        result = await run_analysis(
            file_bytes=raw_bytes,
            filename=file.filename or "upload",
            db=db,
        )
        return BatchResultItem(filename=result.filename, result=result)

    except Exception as exc:  # noqa: BLE001
        return BatchResultItem(filename=file.filename or "upload", error=str(exc))


@router.post("/batch", response_model=BatchResponse, summary="Analyze up to 10 images")
async def analyze_batch(
    files: Annotated[list[UploadFile], File(description="Up to 10 images")],
    db: AsyncSession = Depends(get_db),
) -> BatchResponse:
    if len(files) > MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=422,
            detail=f"Batch size exceeds maximum of {MAX_BATCH_SIZE} images.",
        )

    start = time.time()
    results = await asyncio.gather(*[_analyze_one(f, db) for f in files])
    elapsed_ms = int((time.time() - start) * 1000)

    return BatchResponse(results=list(results), total_analysis_time_ms=elapsed_ms)
