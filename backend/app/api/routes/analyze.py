import uuid
from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile, status

from app.core.config import settings
from app.models.schemas import JobAcceptedResponse, JobStatusResponse
from app.services.analysis_service import get_job_status, run_analysis_background
from app.utils.validation import validate_image_file

router = APIRouter()


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
    raw_bytes = await validate_image_file(file)

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

