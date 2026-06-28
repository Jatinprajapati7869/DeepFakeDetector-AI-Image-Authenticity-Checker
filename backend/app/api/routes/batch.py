import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile, status

from app.core.config import settings
from app.models.schemas import JobAcceptedResponse
from app.services.analysis_service import _jobs, run_analysis

router = APIRouter()

MAX_BATCH_SIZE = 10
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


async def run_batch_background(job_id: str, files_data: list[tuple[bytes, str]]) -> None:
    from app.db.database import AsyncSessionLocal
    import time
    from app.models.schemas import BatchResultItem

    _jobs[job_id] = {"status": "processing"}
    start = time.time()
    results = []

    try:
        async with AsyncSessionLocal() as db:
            for file_bytes, filename in files_data:
                try:
                    result = await run_analysis(file_bytes, filename, db)
                    results.append(BatchResultItem(filename=filename, result=result).model_dump())
                except Exception as exc:
                    results.append(BatchResultItem(filename=filename, error=str(exc)).model_dump())

            elapsed_ms = int((time.time() - start) * 1000)
            _jobs[job_id] = {
                "status": "completed",
                "result": {"results": results, "total_analysis_time_ms": elapsed_ms},
            }
    except Exception as exc:
        _jobs[job_id] = {"status": "failed", "error": str(exc)}


@router.post(
    "/batch",
    response_model=JobAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Analyze up to 10 images (Background Task)",
)
async def analyze_batch(
    background_tasks: BackgroundTasks,
    files: Annotated[list[UploadFile], File(description="Up to 10 images")],
) -> JobAcceptedResponse:
    if len(files) > MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=422,
            detail=f"Batch size exceeds maximum of {MAX_BATCH_SIZE} images.",
        )

    files_data = []
    for f in files:
        if f.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=415, detail=f"Unsupported type: {f.content_type}"
            )
        raw_bytes = await f.read()
        if len(raw_bytes) > settings.max_upload_size_bytes:
            raise HTTPException(
                status_code=413, detail=f"File exceeds {settings.max_upload_size_mb} MB limit."
            )
        files_data.append((raw_bytes, f.filename or "upload"))

    job_id = str(uuid.uuid4())
    background_tasks.add_task(run_batch_background, job_id, files_data)

    return JobAcceptedResponse(job_id=job_id)

