# Remediation Plan: Career Intelligence Studio (CIS)

This remediation plan outlines the step-by-step actions required to bring the CIS monorepo up to production-grade readiness, addressing the findings detailed in the [Production Readiness Review](file:///c:/Users/rajaj/Projects/CV%20and%20Interview%20Prep%20Builder/docs/production_readiness_review.md).

---

## 1. Critical Actions (Immediate Priority)

### 1.1 Secure API Authentication & Remove Dev Bypass
* **Issue**: The `get_current_user` dependency in `apps/api/src/main.py` contains a hardcoded developer login bypass, making all API endpoints public.
* **Remediation Steps**:
  1. Replace the developer bypass logic in `get_current_user` with a JWT validation helper.
  2. Implement JWKS (JSON Web Key Sets) retrieval to verify signatures of tokens issued by your identity provider (e.g., Cognito, Auth0, Keycloak).
  3. Raise standard FastAPI `HTTPException(status_code=401, detail="Could not validate credentials")` on invalid or missing tokens.
  4. Create a dev-only mock token generator script for local testing purposes.
* **Impact**: Secures all customer data and restricts access to authenticated users.
* **Effort**: Low (1-2 days)
* **ADR Reference**: [ADR-0001: JWT Authentication](file:///c:/Users/rajaj/Projects/CV%20and%20Interview%20Prep%20Builder/docs/adr/adr-0001-production-auth-jwt.md)

### 1.2 Remove Hardcoded Secrets
* **Issue**: plain text secrets (database passwords, default JWT secrets) are stored directly in `config.py` and `docker-compose.yml`.
* **Remediation Steps**:
  1. Modify `apps/api/src/config.py` to raise an configuration error on startup in production if `JWT_SECRET` is not set or uses the default dev key.
  2. Transition to environment variables or cloud secret managers (e.g., AWS Secrets Manager, HashiCorp Vault) to inject database credentials.
  3. Add `.env` patterns to `.gitignore` to prevent secret leakage in version control.
* **Impact**: Mitigates credential leakage risks.
* **Effort**: Low (1 day)

---

## 2. High Priority Actions (Before Public Beta)

### 2.1 Transition to Asynchronous Database Session Management
* **Issue**: Synchronous SQLAlchemy queries executed inside FastAPI asynchronous route handlers block the single-threaded event loop, leading to scale limitations and request timeouts under load.
* **Remediation Steps**:
  1. Install `asyncpg` dependency in `pyproject.toml`.
  2. Refactor `apps/api/src/database.py` to use `create_async_engine` and `async_sessionmaker`.
  3. Update `get_db` dependency to yield an `AsyncSession`.
  4. Refactor all database operations in `apps/api/src/main.py` to use `await db.execute(...)` instead of `db.query(...)`.
  5. Refactor Alembic configuration to support async connections.
* **Impact**: Significantly increases server throughput and eliminates thread pool bottleneck.
* **Effort**: High (5-7 days)
* **ADR Reference**: [ADR-0002: Async Database Sessions](file:///c:/Users/rajaj/Projects/CV%20and%20Interview%20Prep%20Builder/docs/adr/adr-0002-async-database-sessions.md)

### 2.2 Secure Vector Database Tenant Isolation
* **Issue**: User vectors are stored in a single Qdrant collection, relying on metadata query filters for isolation. Filter omission in code leads to multi-tenant data leaks.
* **Remediation Steps**:
  1. Modify the `EmbeddingPipeline` and `HybridRetrieval` classes to use Qdrant's native **Named Partitions (Partition Keys)**.
  2. Designate `user_id` as the partition key mapping data to isolated indexes.
  3. Implement middleware validation checking that all vector queries enforce the tenant partition identifier.
* **Impact**: Guarantees database-level tenant isolation, preventing cross-tenant leakage.
* **Effort**: Medium (3-4 days)
* **ADR Reference**: [ADR-0003: Qdrant Isolation](file:///c:/Users/rajaj/Projects/CV%20and%20Interview%20Prep%20Builder/docs/adr/adr-0003-secure-tenant-isolation-qdrant.md)

### 2.3 Close the Lexical Fallback Loophole in AI Grounding
* **Issue**: A naive fallback lexical checker checks if any word of length > 4 matches the evidence text, which easily bypasses validation and allows hallucinated statements to pass.
* **Remediation Steps**:
  1. Remove the word-in-text loop fallback logic in `resume_optimization.py` and `main.py`.
  2. Implement a BM25 or Jaccard similarity score token overlap calculation.
  3. Require a minimum overlap score of `>= 0.5` across keywords to validate grounding.
  4. Package a lightweight local transformer library to handle offline semantic verification when external API calls fail.
* **Impact**: Eliminates AI hallucination escape routes and guarantees truth-preservation.
* **Effort**: Medium (2-3 days)
* **ADR Reference**: [ADR-0004: Robust Grounding](file:///c:/Users/rajaj/Projects/CV%20and%20Interview%20Prep%20Builder/docs/adr/adr-0004-robust-grounding-hallucination-prevention.md)

---

## 3. Medium Priority Actions (Prior to Scaled Production)

### 3.1 Unify Monorepo Test Suites & Configure CI
* **Issue**: Frontend Next.js has zero test coverage, the root tests folder is empty, and Python pytest is excluded from the turborepo build system.
* **Remediation Steps**:
  1. Add a `package.json` file inside `apps/api` wrapping `poetry run pytest` under a `"test"` script.
  2. Install Vitest and React Testing Library in `apps/web` for frontend unit testing.
  3. Configure a GitHub Actions workflow that runs `turbo run test` on pull requests.
* **Impact**: Ensures quality assurance and prevents regression bugs.
* **Effort**: Medium (3 days)
* **ADR Reference**: [ADR-0006: Monorepo Testing](file:///c:/Users/rajaj/Projects/CV%20and%20Interview%20Prep%20Builder/docs/adr/adr-0006-testing-coverage-ci-integration.md)

### 3.2 Upgrade Production Cloud Infrastructure (Terraform)
* **Issue**: Infrastructure is configured as single-node instances, lacking redundancy and scaling headroom.
* **Remediation Steps**:
  1. Upgrade RDS to Multi-AZ and add a Read Replica for read operations.
  2. Set up SSL enforcement for all database client connections.
  3. Cluster ElastiCache Redis for high-availability failovers.
  4. Enable persistent AWS EFS storage on Qdrant ECS tasks.
* **Impact**: Provides high-availability (99.9% uptime) and durability guarantees.
* **Effort**: Medium (3-4 days)
* **ADR Reference**: [ADR-0005: SaaS Infrastructure Scaling](file:///c:/Users/rajaj/Projects/CV%20and%20Interview%20Prep%20Builder/docs/adr/adr-0005-saas-infrastructure-scaling.md)

---

## 4. Remediation Checklist & Status Tracker

- [ ] **Phase 1: Security Hardening**
  - [ ] Rewrite `get_current_user` with JWT verification.
  - [ ] Enforce environment secret configuration checks.
  - [ ] Implement database SSL connection requirements.
- [ ] **Phase 2: Core Scaling**
  - [ ] Refactor database engine and queries to async/await syntax.
  - [ ] Implement Qdrant Named Partitions for tenant data.
- [ ] **Phase 3: AI Quality & Grounding**
  - [ ] Replace naive fallback validator with BM25/Jaccard overlap scoring.
  - [ ] Integrate local transformer model fallback for embedding services.
- [ ] **Phase 4: DevSecOps & CI**
  - [ ] Standardize turborepo test runner configuration.
  - [ ] Establish automated GitHub Actions workflow verification.
