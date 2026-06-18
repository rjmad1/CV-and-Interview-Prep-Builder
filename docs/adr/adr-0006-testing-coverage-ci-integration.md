# ADR-0006: Monorepo Testing & CI/CD Integration

* **Status**: Proposed
* **Date**: 2026-06-18
* **Authors**: Antigravity Principal Architect Agent

## Context
A production-ready application requires a comprehensive CI/CD testing pipeline that executes checks across all workspaces. Currently, the monorepo has several integration gaps:
- The frontend Next.js application (`apps/web`) has no testing suite configured.
- The root `tests/` directory is completely empty.
- Pytest tests inside `apps/api` run in isolation and are not mapped to the root `pnpm test` script.
- There are no automated integration or End-to-End (E2E) tests verifying the API-to-Web integration.

## Decision
We will establish a standardized test execution suite across the monorepo:
1. **Frontend Testing Suite**: Configure Vitest and React Testing Library inside `apps/web` for component unit testing, and Playwright for End-to-End user flow tests.
2. **Root Workspace Integration**: 
   - Add a `package.json` in `apps/api` with a `test` script wrapper running Python pytest:
     ```json
     "scripts": {
       "test": "poetry run pytest"
     }
     ```
   - This integrates the Python tests into the turborepo build system, enabling `turbo run test` at the workspace root to execute both frontend Next.js tests and backend FastAPI tests concurrently.
3. **Continuous Integration Pipeline**:
   - Establish a GitHub Actions workflow that executes `pnpm install`, builds the workspaces, and executes `turbo run test` on every pull request.
   - Enforce a minimum test coverage threshold (e.g. 80%) to pass CI checks.

## Consequences
* **Trade-offs**: Wrapping Python commands inside Node.js scripts adds a slight toolchain overhead, but it unites the monorepo workspace and ensures standard build procedures.
* **Limitations**: Running Python tests inside Node containers requires configuring both Node and Python runtimes in CI runner agents.
* **Future Work**: Add visual regression testing to prevent UI breaks in the Next.js resume builder interface.
