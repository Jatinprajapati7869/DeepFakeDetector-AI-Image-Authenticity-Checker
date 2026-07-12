from httpx import AsyncClient


async def test_health_reports_model_mode(client: AsyncClient):
    response = await client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"]
    assert body["demo_mode"] is True
    assert body["model_mode"] == "demo"
    assert body["model_loaded"] is False
