# Contributing to Career Intelligence Studio

## Prerequisites

- **Python 3.11+** with `pip` and `venv`
- **Node.js 18+** with `npm`
- **PostgreSQL 15+** (or SQLite for local dev/testing)
- **Docker** (optional, for Qdrant vector DB)

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url> && cd "CV and Interview Prep Builder"

# 2. Backend setup
cd apps/api
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\Activate.ps1
pip install -e ".[dev]"

# 3. Frontend setup
cd ../web
npm install

# 4. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 5. Start services
make dev  # or manually:
# Terminal 1: cd apps/api && uvicorn apps.api.src.main:app --reload
# Terminal 2: cd apps/web && npm run dev
```

## Project Structure

```
apps/
├── api/                     # FastAPI backend
│   ├── src/
│   │   ├── main.py          # App construction & middleware only
│   │   ├── config.py        # Pydantic settings (from .env)
│   │   ├── database.py      # Async SQLAlchemy engine
│   │   ├── models.py        # SQLAlchemy ORM models
│   │   ├── routers/         # FastAPI APIRouter modules (one per domain)
│   │   │   ├── deps.py      # Shared auth & DB dependencies
│   │   │   ├── documents.py
│   │   │   ├── jd.py
│   │   │   ├── resume.py
│   │   │   ├── ats.py
│   │   │   ├── interview.py
│   │   │   ├── applications.py
│   │   │   ├── cover_letter.py
│   │   │   ├── evidence.py
│   │   │   ├── orchestration.py
│   │   │   └── app_settings.py
│   │   ├── engine/          # Business logic engines
│   │   ├── graph/           # LangGraph workflow definitions
│   │   └── utils/           # Shared utilities
│   └── tests/               # pytest suite
└── web/                     # Next.js frontend
    └── app/
        ├── types.ts         # Shared TypeScript domain types
        ├── api/apiFetch.ts  # API client with header injection
        ├── store.ts         # Zustand state management
        └── page.tsx         # Main application page
```

## Development Workflow

### Backend

```bash
# Run API server with hot reload
cd apps/api
uvicorn apps.api.src.main:app --reload --port 8000

# Run tests
pytest apps/api/tests/ -v

# Run linter
ruff check apps/api/src/

# Type checking
mypy apps/api/src/

# Security scan
bandit -r apps/api/src/ -ll
```

### Frontend

```bash
cd apps/web
npm run dev          # Dev server on :3000
npm run build        # Production build
npm run lint         # ESLint check
```

## Code Style

### Python
- **Formatter**: `ruff format`
- **Linter**: `ruff check`
- **Line length**: 120 characters
- **Async-first**: All FastAPI endpoints use `async def` with `AsyncSession`
- **No global fetch shims**: Use `await db.execute()` directly (not `execute_db` wrappers)

### TypeScript
- **Types**: All domain interfaces in `apps/web/app/types.ts`
- **API calls**: Use `apiFetch` from `app/api/apiFetch.ts` (never shadow `fetch`)
- **State**: Zustand store in `app/store.ts`

## Architecture Decisions

### Why sync SessionLocal in LangGraph nodes?
LangGraph nodes execute in a synchronous context. The async `AsyncSession` is owned by FastAPI's request lifecycle and cannot be shared across graph node boundaries. We use `SessionLocal()` (sync) intentionally in `graph/resume_optimization.py` for DB writes. See `ponytail:` comments in code.

### Why separate routers/ instead of a single main.py?
The original `main.py` was 2,745 lines. Decomposing into ~12 router modules enables:
- Independent testing of each domain
- Parallel code review
- Clear ownership boundaries
- IDE navigation by domain, not by line number

### Why apiFetch instead of overriding global fetch?
Shadowing `window.fetch` is fragile — it breaks Next.js SSR, conflicts with third-party libraries, and makes debugging network requests harder. `apiFetch` is explicit and traceable.

## Pull Request Checklist

- [ ] Backend changes include tests
- [ ] No hardcoded paths (use `settings.*`)
- [ ] No hardcoded secrets (use environment variables)
- [ ] No N+1 queries (use JOINs or `selectinload`)
- [ ] API endpoints use `async def` + `AsyncSession`
- [ ] Frontend types are in `types.ts`, not inline
- [ ] API calls use `apiFetch`, not raw `fetch`
