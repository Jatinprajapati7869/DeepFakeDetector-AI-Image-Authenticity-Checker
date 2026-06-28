"""
Integration tests for GET /api/history and GET /api/history/{id}.

The `client` fixture is provided by conftest.py (in-memory SQLite, tables
created/dropped around each test for full isolation).
"""

import io

from httpx import AsyncClient
from PIL import Image


def _make_jpeg_bytes() -> bytes:
    img = Image.new("RGB", (32, 32), color=(80, 80, 80))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


async def test_history_starts_empty(client: AsyncClient):
    response = await client.get("/api/history")
    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert "total" in body
    assert body["page"] == 1


async def test_history_contains_analysis_after_upload(client: AsyncClient):
    await client.post(
        "/api/analyze",
        files={"file": ("history_test.jpg", _make_jpeg_bytes(), "image/jpeg")},
    )
    response = await client.get("/api/history")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert any(item["filename"] == "history_test.jpg" for item in body["items"])


async def test_get_analysis_by_id(client: AsyncClient):
    upload = await client.post(
        "/api/analyze",
        files={"file": ("single_lookup.jpg", _make_jpeg_bytes(), "image/jpeg")},
    )
    analysis_id = upload.json()["id"]

    response = await client.get(f"/api/history/{analysis_id}")
    assert response.status_code == 200
    assert response.json()["id"] == analysis_id


async def test_get_nonexistent_analysis_returns_404(client: AsyncClient):
    response = await client.get("/api/history/nonexistent-id-00000")
    assert response.status_code == 404
