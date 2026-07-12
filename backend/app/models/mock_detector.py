"""
Deterministic demo detector used when DEMO_MODE or USE_MOCK_MODEL is enabled.

This keeps the API, database, polling, and Grad-CAM flow runnable without large
model weights. Results are simulated and must not be presented as real model
predictions.
"""

from __future__ import annotations

import hashlib
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from PIL import Image as PILImage


def mock_predict(image: PILImage) -> tuple[str, float]:
    """Return a stable simulated verdict for a given image."""
    normalized = image.convert("RGB").resize((16, 16))
    digest = hashlib.sha256(normalized.tobytes()).digest()
    score = int.from_bytes(digest[:2], byteorder="big") / 65535

    verdict = "FAKE" if score >= 0.5 else "REAL"
    confidence = 0.72 + abs(score - 0.5) * 0.54
    return verdict, round(min(confidence, 0.99), 4)
