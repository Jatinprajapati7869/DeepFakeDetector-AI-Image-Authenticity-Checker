"""
In-process sliding-window rate limiter implemented as a FastAPI middleware.

No external dependencies — uses only the Python standard library.
Each IP address is allowed at most `limit` requests per `window_seconds`.
Old timestamps are pruned on each request to keep memory bounded.
"""

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp


def _get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window rate limiter applied to a configurable set of path prefixes.

    Args:
        app: The ASGI application to wrap.
        limit: Maximum requests allowed per IP within the window.
        window_seconds: Duration of the sliding window.
        paths: URL path prefixes to apply rate limiting to.
    """

    def __init__(
        self,
        app: ASGIApp,
        limit: int = 10,
        window_seconds: int = 60,
        paths: tuple[str, ...] = ("/api/analyze", "/api/batch"),
    ) -> None:
        super().__init__(app)
        self._limit = limit
        self._window = window_seconds
        self._paths = paths
        self._buckets: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()
        self._last_cleanup: float = 0.0

    async def dispatch(self, request: Request, call_next) -> Response:
        if not any(request.url.path.startswith(p) for p in self._paths):
            return await call_next(request)

        ip = _get_client_ip(request)
        now = time.monotonic()
        cutoff = now - self._window

        with self._lock:
            # Periodically clean up stale buckets to prevent memory leaks
            if now - self._last_cleanup > 300:
                stale_ips = [
                    k for k, v in self._buckets.items() 
                    if not v or v[-1] < cutoff
                ]
                for k in stale_ips:
                    del self._buckets[k]
                self._last_cleanup = now

            bucket = self._buckets[ip]
            # Prune timestamps outside the current window
            while bucket and bucket[0] < cutoff:
                bucket.popleft()

            if len(bucket) >= self._limit:
                return Response(
                    content='{"detail":"Rate limit exceeded. Please wait before retrying."}',
                    status_code=429,
                    media_type="application/json",
                    headers={"Retry-After": str(self._window)},
                )

            bucket.append(now)

        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds standard HTTP security headers to all responses to protect against
    MIME-sniffing, clickjacking, and XSS.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response
