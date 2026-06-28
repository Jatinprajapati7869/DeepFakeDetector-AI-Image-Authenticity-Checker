"""
Unit tests for the Grad-CAM engine.

Validates that the mock heatmap generation produces a valid PNG
at the correct path without requiring trained weights.
"""
import os
import uuid
from pathlib import Path

import pytest
from PIL import Image

os.environ.setdefault("USE_MOCK_MODEL", "true")

from app.models.gradcam import GradCAMEngine  # noqa: E402
from app.core.config import settings  # noqa: E402


@pytest.fixture
def sample_image() -> Image.Image:
    return Image.new("RGB", (128, 128), color=(120, 80, 60))


def test_mock_heatmap_creates_png_file(sample_image: Image.Image, tmp_path: Path):
    # Override storage path to a temp directory
    original_path = settings.heatmap_storage_path
    settings.heatmap_storage_path = str(tmp_path)

    engine = GradCAMEngine(model=None)
    analysis_id = str(uuid.uuid4())
    url = engine.generate(sample_image, target_class=1, analysis_id=analysis_id)

    heatmap_file = tmp_path / f"{analysis_id}.png"
    assert heatmap_file.exists(), "Heatmap PNG file should be created"
    assert heatmap_file.stat().st_size > 0, "Heatmap PNG should not be empty"
    assert url == f"/api/heatmap/{analysis_id}"

    settings.heatmap_storage_path = original_path


def test_heatmap_dimensions_match_input(sample_image: Image.Image, tmp_path: Path):
    original_path = settings.heatmap_storage_path
    settings.heatmap_storage_path = str(tmp_path)

    engine = GradCAMEngine(model=None)
    analysis_id = str(uuid.uuid4())
    engine.generate(sample_image, target_class=1, analysis_id=analysis_id)

    from PIL import Image as PILImage
    result = PILImage.open(tmp_path / f"{analysis_id}.png")
    assert result.size == sample_image.size, "Heatmap should match original image dimensions"

    settings.heatmap_storage_path = original_path
