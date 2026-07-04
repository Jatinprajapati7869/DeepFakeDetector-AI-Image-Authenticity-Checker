"""
Integration tests for POST /api/batch.

Uses the same in-memory SQLite + mock model setup as the rest of the suite.
"""

import io

from httpx import AsyncClient
from PIL import Image


def _make_jpeg_bytes(width: int = 32, height: int = 32) -> bytes:
    img = Image.new("RGB", (width, height), color=(120, 80, 160))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


async def _submit_and_poll(client: AsyncClient, files: list) -> dict:
    """Submit a batch job and poll until complete. Returns the status body."""
    response = await client.post("/api/batch", files=files)
    assert response.status_code == 202, response.text
    job_id = response.json()["job_id"]
    status = await client.get(f"/api/status/{job_id}")
    assert status.status_code == 200
    return status.json()


async def test_batch_two_valid_jpegs(client: AsyncClient):
    """B1: Two valid JPEGs are accepted, queued, and both appear in the result."""
    jpeg = _make_jpeg_bytes()
    body = await _submit_and_poll(
        client,
        files=[
            ("files", ("a.jpg", jpeg, "image/jpeg")),
            ("files", ("b.jpg", jpeg, "image/jpeg")),
        ],
    )
    assert body["status"] == "completed"
    results = body["result"]["results"]
    assert len(results) == 2
    filenames = {r["filename"] for r in results}
    assert "a.jpg" in filenames
    assert "b.jpg" in filenames


async def test_batch_no_files_returns_422(client: AsyncClient):
    """B2: An empty batch is rejected at the FastAPI validation layer."""
    response = await client.post("/api/batch", files=[])
    assert response.status_code == 422


async def test_batch_unsupported_format_returns_415(client: AsyncClient):
    """B3: Uploading a non-image MIME type is rejected before the job is queued."""
    response = await client.post(
        "/api/batch",
        files=[("files", ("document.pdf", b"%PDF-1.4", "application/pdf"))],
    )
    assert response.status_code == 415


async def test_batch_result_has_correct_schema(client: AsyncClient):
    """B4: Each result item contains filename + either a result object or an error string."""
    jpeg = _make_jpeg_bytes()
    body = await _submit_and_poll(
        client,
        files=[("files", ("schema.jpg", jpeg, "image/jpeg"))],
    )
    assert body["status"] == "completed"
    item = body["result"]["results"][0]
    assert "filename" in item
    # Items are either a success result or a per-item error
    assert "result" in item or "error" in item
    if item.get("result"):
        assert item["result"]["verdict"] in ("REAL", "FAKE")
        assert 0.0 <= item["result"]["confidence"] <= 1.0
        assert "artifacts" in item["result"]
