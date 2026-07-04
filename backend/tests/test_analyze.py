"""
Integration tests for POST /api/analyze.

Run against the live FastAPI app with USE_MOCK_MODEL=true — no weights needed.
The `client` fixture is provided by conftest.py (in-memory SQLite, tables
created/dropped around each test).
"""

import io

from httpx import AsyncClient
from PIL import Image


def _make_jpeg_bytes(width: int = 64, height: int = 64) -> bytes:
    img = Image.new("RGB", (width, height), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


async def test_analyze_valid_jpeg(client: AsyncClient):
    response = await client.post(
        "/api/analyze",
        files={"file": ("test.jpg", _make_jpeg_bytes(), "image/jpeg")},
    )
    assert response.status_code == 202
    body = response.json()
    assert "job_id" in body

    # Poll the job status endpoint until the background task completes
    job_id = body["job_id"]
    status_response = await client.get(f"/api/status/{job_id}")
    assert status_response.status_code == 200
    status_body = status_response.json()
    assert status_body["status"] == "completed"
    result = status_body["result"]
    assert result["verdict"] in ("REAL", "FAKE")
    assert 0.0 <= result["confidence"] <= 1.0
    assert "heatmap_url" in result
    assert "artifacts" in result


async def test_analyze_unsupported_format(client: AsyncClient):
    response = await client.post(
        "/api/analyze",
        files={"file": ("test.gif", b"GIF89a", "image/gif")},
    )
    assert response.status_code == 415


async def test_analyze_oversized_file(client: AsyncClient):
    big_bytes = b"x" * (10 * 1024 * 1024 + 1)
    response = await client.post(
        "/api/analyze",
        files={"file": ("big.jpg", big_bytes, "image/jpeg")},
    )
    assert response.status_code == 413


async def test_health_endpoint(client: AsyncClient):
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
