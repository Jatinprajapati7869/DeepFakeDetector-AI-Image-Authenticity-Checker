"""
Shared pytest fixtures for the backend test suite.

Uses an in-memory SQLite database so tests never touch the production
data/history.db file and each session starts from a clean slate.
"""

import os

import pytest_asyncio

# Force mock + in-memory DB for tests — must be set before any app imports
os.environ["USE_MOCK_MODEL"] = "true"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

from httpx import ASGITransport, AsyncClient

from app.db.database import Base, engine
from app.main import app
from app.models.detector import detector
from app.models.gradcam import init_gradcam


@pytest_asyncio.fixture(scope="function")
async def client():
    """
    Provide a fresh httpx AsyncClient per test.

    Creates all DB tables before each test so the schema always exists,
    and drops them after so tests don't bleed state into each other.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    init_gradcam(detector.get_model())

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
