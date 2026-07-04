from fastapi import HTTPException, UploadFile
from app.core.config import settings

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

async def validate_image_file(file: UploadFile) -> bytes:
    """Validates the file type and size, returning the raw bytes if valid."""
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

    return raw_bytes
