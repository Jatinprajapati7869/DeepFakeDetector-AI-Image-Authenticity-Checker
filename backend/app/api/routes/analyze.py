import uuid
from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile, status

from app.core.config import settings
from app.models.schemas import JobAcceptedResponse, JobStatusResponse
from app.services.analysis_service import get_job_status, run_analysis_background

router = APIRouter()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post(
    "/analyze",
    response_model=JobAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Analyze a single image (Background Task)",
)
async def analyze_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="JPEG, PNG, or WebP image (max 10 MB)"),
) -> JobAcceptedResponse:
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

    job_id = str(uuid.uuid4())
    background_tasks.add_task(
        run_analysis_background, job_id, raw_bytes, file.filename or "upload"
    )

    return JobAcceptedResponse(job_id=job_id)


@router.get(
    "/status/{job_id}",
    response_model=JobStatusResponse,
    summary="Get background job status",
)
async def get_status(job_id: str) -> JobStatusResponse:
    job = get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobStatusResponse(
        job_id=job_id,
        status=job["status"],
        result=job.get("result"),
        error=job.get("error"),
    )

