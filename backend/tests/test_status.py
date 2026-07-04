"""
Integration tests for GET /api/status/{job_id}.
"""

from httpx import AsyncClient

from app.services.analysis_service import register_job, update_job


async def test_status_unknown_job_returns_404(client: AsyncClient):
    """S1: Polling an unknown or pruned job_id returns 404."""
    response = await client.get("/api/status/unknown-job-123")
    assert response.status_code == 404
    assert response.json()["detail"] == "Job not found"


async def test_status_processing_job(client: AsyncClient):
    """S2: A job that is registered but not complete returns 'processing'."""
    job_id = "test-processing-uuid"
    register_job(job_id)

    response = await client.get(f"/api/status/{job_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "processing"
    assert body["job_id"] == job_id
    assert body["result"] is None
    assert body["error"] is None


async def test_status_completed_job(client: AsyncClient):
    """S3: A completed job returns 'completed' and includes the result."""
    job_id = "test-completed-uuid"
    register_job(job_id)
    update_job(
        job_id,
        {
            "status": "completed",
            "result": {"verdict": "REAL", "confidence": 0.99, "heatmap_url": "http://test"},
        },
    )

    response = await client.get(f"/api/status/{job_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert body["result"]["verdict"] == "REAL"
    assert body["error"] is None


async def test_status_failed_job(client: AsyncClient):
    """S4: A failed job returns 'failed' and includes the error message."""
    job_id = "test-failed-uuid"
    register_job(job_id)
    update_job(job_id, {"status": "failed", "error": "Analysis failed due to bad image data"})

    response = await client.get(f"/api/status/{job_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "failed"
    assert body["error"] == "Analysis failed due to bad image data"
    assert body["result"] is None
