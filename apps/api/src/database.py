import os

from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from apps.api.src.config import settings

# Use TESTING env var only — never sys.modules introspection (order-dependent, brittle)
is_testing = os.getenv("TESTING", "").lower() == "true"
db_url = "sqlite:///test_career_intelligence_studio.db" if is_testing else settings.DATABASE_URL

is_sqlite = db_url.startswith("sqlite")

# --- Sync Setup (for LangGraph / Celery nodes) ---
if is_sqlite:
    engine = create_engine(db_url, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    connect_args = {}
    if settings.ENV == "production":
        connect_args["sslmode"] = "require"
    engine = create_engine(
        db_url,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True,
        connect_args=connect_args,
    )

SessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine, expire_on_commit=False
)

# --- Async Setup (FastAPI) ---
if is_sqlite:
    db_url_async = db_url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    if db_url_async in ("sqlite://", "sqlite:///:memory:"):
        db_url_async = "sqlite+aiosqlite:///:memory:"
    async_connect_args: dict = {}
else:
    db_url_async = db_url.replace("postgresql://", "postgresql+asyncpg://", 1).replace(
        "postgres://", "postgresql+asyncpg://", 1
    )
    async_connect_args = {"ssl": "require"} if settings.ENV == "production" else {}

async_engine = create_async_engine(
    db_url_async,
    pool_pre_ping=True,
    connect_args=async_connect_args,
    **({} if is_sqlite else {"pool_size": 20, "max_overflow": 10}),
)

AsyncSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


def set_tenant_context(session, user_id: str) -> None:
    """Sets the PostgreSQL RLS tenant context for sync sessions."""
    if session.bind.dialect.name == "postgresql":
        session.execute(
            text("SET LOCAL app.current_user_id = :user_id"),
            {"user_id": user_id},
        )


async def set_tenant_context_async(session: AsyncSession, user_id: str) -> None:
    """Sets the PostgreSQL RLS tenant context for async sessions."""
    if session.bind.dialect.name == "postgresql":
        await session.execute(
            text("SET LOCAL app.current_user_id = :user_id"),
            {"user_id": user_id},
        )


async def get_db():
    """FastAPI dependency provider — yields an AsyncSession per request."""
    async with AsyncSessionLocal() as db:
        yield db
