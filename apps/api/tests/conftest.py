"""
pytest configuration and shared fixtures for Career Intelligence Studio tests.

Sets TESTING=true before any imports so database.py uses the SQLite test URL.
"""
import os
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock

# Set env before any app imports
os.environ["TESTING"] = "true"
os.environ["ENV"] = "development"
os.environ["NVIDIA_API_KEY"] = ""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from httpx import AsyncClient, ASGITransport


# --- In-memory async SQLite engine for tests ---

@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", connect_args={"check_same_thread": False})
    from apps.api.src.database import Base
    from apps.api.src import models  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    """Yields a fresh AsyncSession per test, rolled back after each test."""
    Session = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as session:
        yield session


# --- Mock AI gateway client ---

@pytest.fixture
def mock_ai_client(monkeypatch):
    """Replaces the ai_gateway_client singleton with a mock that returns predictable outputs."""
    mock = MagicMock()
    mock.generate = AsyncMock(return_value="• Implemented FastAPI backend with PostgreSQL RLS.\n• Built vector search using Qdrant.")
    mock.embed = AsyncMock(return_value=[[0.1] * 1024, [0.1] * 1024])
    mock.rerank = AsyncMock(return_value=[{"index": 0, "relevance_score": 0.9}])
    mock.classify = AsyncMock(return_value="resume")

    import apps.api.src.utils.ai_client as ai_module
    monkeypatch.setattr(ai_module, "ai_gateway_client", mock)
    return mock


# --- FastAPI test client ---

@pytest_asyncio.fixture
async def client(db_session, mock_ai_client):
    """Provides an httpx AsyncClient wired to the FastAPI app with DB override."""
    from apps.api.src.main import app
    from apps.api.src.database import get_db
    from apps.api.src.routers.deps import get_current_user
    from apps.api.src.models import User
    import uuid

    async def override_get_db():
        yield db_session

    async def override_get_current_user():
        return User(
            id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            email="test@example.com",
            hashed_password="hash",
            first_name="Test",
            last_name="User",
            role="user",
        )

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
