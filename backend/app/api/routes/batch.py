import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile, status

from app.models.schemas import JobAcceptedResponse
from app.services.analysis_service import run_batch_background
from app.utils.validation import validate_image_file

router = APIRouter()

MAX_BATCH_SIZE = 10


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
        raw_bytes = await validate_image_file(f)
        files_data.append((raw_bytes, f.filename or "upload"))

    job_id = str(uuid.uuid4())
    background_tasks.add_task(run_batch_background, job_id, files_data)

    return JobAcceptedResponse(job_id=job_id)

