from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from apps.api.src.config import settings

# Setup SQLAlchemy engine dynamically based on dialect
is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# --- Sync Setup (for LangGraph / Celery) ---
db_url_sync = settings.DATABASE_URL
if is_sqlite:
    engine = create_engine(
        db_url_sync,
        connect_args={"check_same_thread": False}
    )
    
    # Enforce foreign key constraints in SQLite
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
        db_url_sync,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True,
        connect_args=connect_args
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)

# --- Async Setup (for FastAPI router scalability) ---
db_url_async = settings.DATABASE_URL
if is_sqlite:
    if db_url_async == "sqlite://" or db_url_async == "sqlite:///:memory:":
        db_url_async = "sqlite+aiosqlite:///:memory:"
    elif db_url_async.startswith("sqlite:///"):
        db_url_async = db_url_async.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
else:
    if db_url_async.startswith("postgresql://"):
        db_url_async = db_url_async.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif db_url_async.startswith("postgres://"):
        db_url_async = db_url_async.replace("postgres://", "postgresql+asyncpg://", 1)

connect_args = {}
if not is_sqlite and settings.ENV == "production":
    connect_args["ssl"] = "require"

async_engine = create_async_engine(
    db_url_async,
    pool_pre_ping=True,
    connect_args=connect_args,
    **({} if is_sqlite else {"pool_size": 20, "max_overflow": 10})
)

AsyncSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=async_engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

def set_tenant_context(session, user_id: str):
    """Sets the PostgreSQL app.current_user_id context for Row-Level Security (RLS)."""
    if session.bind.dialect.name == "postgresql":
        session.execute(
            text("SET LOCAL app.current_user_id = :user_id"), 
            {"user_id": user_id}
        )

async def set_tenant_context_async(session: AsyncSession, user_id: str):
    """Sets the PostgreSQL app.current_user_id context for Row-Level Security (RLS) asynchronously."""
    dialect = session.bind.dialect.name
    if dialect == "postgresql":
        await session.execute(
            text("SET LOCAL app.current_user_id = :user_id"), 
            {"user_id": user_id}
        )

async def get_db():
    """FastAPI database dependency provider yielding an AsyncSession."""
    async with AsyncSessionLocal() as db:
        yield db
