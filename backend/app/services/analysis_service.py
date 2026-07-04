"""
Orchestrates the full analysis pipeline:
1. Validate and preprocess the uploaded image.
2. Run EfficientNet-B4 inference → verdict + confidence.
3. Generate Grad-CAM heatmap.
4. Compute artifact sub-scores (texture, lighting, edge, frequency).
5. Persist the result to the database.
"""

import asyncio
import logging
import random
import time
import uuid
from io import BytesIO

import cv2
import numpy as np
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

import app.models.gradcam as _gradcam_module  # module ref so we always see the live gradcam_engine
from app.core.config import settings
from app.db.models import AnalysisRecord
from app.models.detector import detector
from app.models.schemas import AnalysisResult, ArtifactBreakdown

_log = logging.getLogger(__name__)

MAX_DIMENSION = 1024  # Resize oversized images before analysis
INFERENCE_TIMEOUT_S = 120  # Max seconds to wait for CPU-bound inference before failing the job

# In-memory job registry for background processing
_jobs: dict[str, dict] = {}
_last_pruned_at: float = 0.0


def get_job_status(job_id: str) -> dict | None:
    global _last_pruned_at
    now = time.time()
    # Prune stale jobs at most once every 5 minutes — deterministic, no burst behaviour
    if now - _last_pruned_at > 300:
        _last_pruned_at = now
        stale_keys = [k for k, v in _jobs.items() if v.get("timestamp", now) < now - 3600]
        for k in stale_keys:
            _jobs.pop(k, None)

    return _jobs.get(job_id)


def register_job(job_id: str) -> None:
    """Mark a job as processing. Called immediately after the background task is queued."""
    _jobs[job_id] = {"status": "processing", "timestamp": time.time()}


def update_job(job_id: str, data: dict) -> None:
    """Write the completed or failed result for a job."""
    _jobs[job_id] = data



def _compute_artifact_scores(image: Image.Image) -> ArtifactBreakdown:
    """
    Compute lightweight artifact sub-scores using classical CV.

    These are heuristic signals, not ground-truth labels. They complement
    the neural network verdict with interpretable per-category scores.
    """
    rgb = np.array(image.convert("RGB"))
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)

    # Texture score: normalized Laplacian variance (low variance = blurry/over-smoothed)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    texture_score = float(np.clip(1.0 - laplacian_var / 2000.0, 0.0, 1.0))

    # Lighting score: standard deviation of gradient magnitude
    gx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    grad_mag = np.sqrt(gx**2 + gy**2)
    lighting_score = float(np.clip(1.0 - grad_mag.std() / 60.0, 0.0, 1.0))

    # Edge score: ratio of Canny edge pixels to total (GAN images often have sharp halos)
    edges = cv2.Canny(gray, 50, 150)
    edge_score = float(np.clip((edges > 0).mean() * 10.0, 0.0, 1.0))

    # Frequency score: ratio of high-frequency DFT energy (GAN checkerboard artifacts)
    f_transform = np.fft.fft2(gray.astype(np.float32))
    f_shift = np.fft.fftshift(f_transform)
    magnitude = np.abs(f_shift)
    h, w = magnitude.shape
    center_mask = np.zeros((h, w), dtype=bool)
    center_mask[h // 4 : 3 * h // 4, w // 4 : 3 * w // 4] = True
    high_freq_ratio = magnitude[~center_mask].sum() / (magnitude.sum() + 1e-8)
    frequency_score = float(np.clip(high_freq_ratio * 4.0, 0.0, 1.0))

    return ArtifactBreakdown(
        texture_score=round(texture_score, 4),
        lighting_score=round(lighting_score, 4),
        edge_score=round(edge_score, 4),
        frequency_score=round(frequency_score, 4),
    )


def _preprocess_image(raw_bytes: bytes) -> Image.Image:
    """Open and resize the image, converting to RGB."""
    image = Image.open(BytesIO(raw_bytes)).convert("RGB")
    w, h = image.size
    if max(w, h) > MAX_DIMENSION:
        scale = MAX_DIMENSION / max(w, h)
        image = image.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    return image


def _run_cpu_heavy_tasks(
    file_bytes: bytes, filename: str, analysis_id: str
) -> tuple[str, float, str, ArtifactBreakdown]:
    """Run all synchronous CPU-bound operations in a thread."""
    try:
        image = _preprocess_image(file_bytes)
    except Exception as exc:
        raise ValueError(f"Could not read image '{filename}': {exc}") from exc

    verdict, confidence = detector.predict(image)
    target_class = 1 if verdict == "FAKE" else 0

    heatmap_url = "/api/heatmap/placeholder"
    if _gradcam_module.gradcam_engine is not None:
        heatmap_url = _gradcam_module.gradcam_engine.generate(
            image, target_class, analysis_id
        )

    artifacts = _compute_artifact_scores(image)
    return verdict, confidence, heatmap_url, artifacts


async def run_analysis(
    file_bytes: bytes,
    filename: str,
    db: AsyncSession,
) -> AnalysisResult:
    """
    Full analysis pipeline for a single image.

    Raises:
        ValueError: If the image cannot be opened (corrupt or unsupported format).
    """
    start_ms = time.time()
    analysis_id = str(uuid.uuid4())

    # Offload PyTorch inference and image processing to a thread pool
    # so we don't block the ASGI event loop and fail health checks.
    try:
        verdict, confidence, heatmap_url, artifacts = await asyncio.wait_for(
            asyncio.to_thread(_run_cpu_heavy_tasks, file_bytes, filename, analysis_id),
            timeout=INFERENCE_TIMEOUT_S,
        )
    except asyncio.TimeoutError:
        raise ValueError(
            f"Analysis of '{filename}' timed out after {INFERENCE_TIMEOUT_S}s. "
            "The server may be under heavy load — please try again."
        )
    elapsed_ms = int((time.time() - start_ms) * 1000)

    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)

    record = AnalysisRecord(
        id=analysis_id,
        filename=filename,
        verdict=verdict,
        confidence=confidence,
        heatmap_url=heatmap_url,
        texture_score=artifacts.texture_score,
        lighting_score=artifacts.lighting_score,
        edge_score=artifacts.edge_score,
        frequency_score=artifacts.frequency_score,
        analysis_time_ms=elapsed_ms,
        created_at=now,
    )
    db.add(record)
    await db.commit()

    return AnalysisResult(
        id=analysis_id,
        verdict=verdict,
        confidence=confidence,
        heatmap_url=heatmap_url,
        artifacts=artifacts,
        analysis_time_ms=elapsed_ms,
        created_at=now,
        filename=filename,
    )


async def run_analysis_background(job_id: str, file_bytes: bytes, filename: str) -> None:
    """Wrapper to run analysis in the background and update job status."""
    from app.db.database import AsyncSessionLocal

    register_job(job_id)
    try:
        async with AsyncSessionLocal() as db:
            result = await run_analysis(file_bytes, filename, db)
            update_job(job_id, {"status": "completed", "result": result.model_dump()})
    except ValueError as exc:
        update_job(job_id, {"status": "failed", "error": str(exc)})
    except Exception:
        _log.exception(
            "Unexpected error in background analysis",
            extra={"job_id": job_id, "filename": filename},
        )
        update_job(job_id, {"status": "failed", "error": "An unexpected error occurred. Please try again."})


async def run_batch_background(job_id: str, files_data: list[tuple[bytes, str]]) -> None:
    from app.db.database import AsyncSessionLocal
    import time
    from app.models.schemas import BatchResultItem

    register_job(job_id)
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
            update_job(job_id, {
                "status": "completed",
                "result": {"results": results, "total_analysis_time_ms": elapsed_ms},
            })
    except Exception as exc:
        update_job(job_id, {"status": "failed", "error": str(exc)})
