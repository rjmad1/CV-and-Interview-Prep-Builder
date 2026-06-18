# ADR-0002: Asynchronous Database Operations in FastAPI

* **Status**: Proposed
* **Date**: 2026-06-18
* **Authors**: Antigravity Principal Architect Agent

## Context
FastAPI runs on an asynchronous event loop designed to handle high concurrency. When I/O operations (like database queries) are executed synchronously, they block the single-threaded event loop.

Currently, the CIS backend (`apps/api/src/main.py`) performs synchronous database queries using standard SQLAlchemy sessions:
```python
docs = db.query(Document).filter(Document.user_id == user.id).all()
```
Since these queries execute synchronously under the hood, FastAPI is forced to run them in a separate thread pool (if run in a sync handler) or block the event loop entirely (if run in an `async def` handler). This limits the concurrency of the API, increases latency under load, and scales poorly in SaaS production.

## Decision
We will transition the database access layer in `apps/api` to use asynchronous database sessions:
1. Use `asyncpg` as the PostgreSQL database driver (transitioning the connection string from `postgresql://` to `postgresql+asyncpg://`).
2. Replace `create_engine` and `sessionmaker` with SQLAlchemy's `create_async_engine` and `async_sessionmaker`.
3. Re-write route handler database queries in `apps/api/src/main.py` using asynchronous queries (`await db.execute(...)` and `scalars().all()`).
4. Update the tenant RLS context setter to run asynchronously:
   ```python
   async def set_tenant_context(session: AsyncSession, user_id: str):
       if session.bind.dialect.name == "postgresql":
           await session.execute(
               text("SET LOCAL app.current_user_id = :user_id"),
               {"user_id": user_id}
           )
   ```

## Consequences
* **Trade-offs**: Rewriting all database interactions from synchronous `session.query` to asynchronous `session.execute` requires significant refactoring of route handlers and helper repositories.
* **Limitations**: Alembic migrations must be configured to run with synchronous connections, which requires maintaining a dual sync/async connection configuration in `alembic/env.py`.
* **Future Work**: Ensure that third-party database plugins or database models in LangGraph nodes are also updated to handle async sessions correctly to avoid connection pooling deadlock.
