"""
Orchestrates the full analysis pipeline:
1. Validate and preprocess the uploaded image.
2. Run EfficientNet-B4 inference → verdict + confidence.
3. Generate Grad-CAM heatmap.
4. Compute artifact sub-scores (texture, lighting, edge, frequency).
5. Persist the result to the database.
"""

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

MAX_DIMENSION = 1024  # Resize oversized images before analysis


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

    try:
        image = _preprocess_image(file_bytes)
    except Exception as exc:
        raise ValueError(f"Could not read image '{filename}': {exc}") from exc

    analysis_id = str(uuid.uuid4())
    verdict, confidence = detector.predict(image)
    target_class = 1 if verdict == "FAKE" else 0

    heatmap_url = "/api/heatmap/placeholder"
    if _gradcam_module.gradcam_engine is not None:
        heatmap_url = _gradcam_module.gradcam_engine.generate(
            image, target_class, analysis_id
        )

    artifacts = _compute_artifact_scores(image)
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
