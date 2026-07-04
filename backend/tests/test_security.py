"""
Integration tests for the RateLimitMiddleware.
"""

import pytest
from unittest import mock
from httpx import AsyncClient

# Test endpoints that have rate limiting applied.
# By default, /api/analyze and /api/batch are protected.


async def test_under_rate_limit(client: AsyncClient):
    """SEC1: Requests under the rate limit succeed."""
    # Hit health first to ensure server is up (health is not rate limited)
    resp = await client.get("/api/health")
    assert resp.status_code == 200

    # We test the rate limiter via a 422 (validation error) since it's faster
    # than processing a real image, but still hits the rate limited path.
    headers = {"X-Forwarded-For": "10.0.0.1"}
    for _ in range(5):
        resp = await client.post("/api/analyze", headers=headers)
        # Should be 422 Unprocessable Entity, not 429 Too Many Requests
        assert resp.status_code == 422


async def test_over_rate_limit(client: AsyncClient):
    """SEC2: Exceeding the rate limit returns 429."""
    headers = {"X-Forwarded-For": "10.0.0.2"}
    
    # 10 is the default limit
    for _ in range(10):
        resp = await client.post("/api/analyze", headers=headers)
        assert resp.status_code == 422
        
    # The 11th request should be rate limited
    resp = await client.post("/api/analyze", headers=headers)
    assert resp.status_code == 429
    assert resp.json()["detail"] == "Rate limit exceeded. Please wait before retrying."
    assert "Retry-After" in resp.headers


@mock.patch("app.core.security.time.monotonic")
async def test_rate_limit_resets_after_window(mock_time, client: AsyncClient):
    """SEC3: Rate limit resets after the window elapses."""
    headers = {"X-Forwarded-For": "10.0.0.3"}
    
    # Mock time.monotonic to control the sliding window
    mock_time.return_value = 100.0
    
    # Consume all limit
    for _ in range(10):
        await client.post("/api/analyze", headers=headers)
        
    # Verify we are blocked
    resp = await client.post("/api/analyze", headers=headers)
    assert resp.status_code == 429
    
    # Advance time by 61 seconds (window is 60s)
    mock_time.return_value = 161.0
    
    # The next request should succeed because the window slid forward
    resp = await client.post("/api/analyze", headers=headers)
    assert resp.status_code == 422
