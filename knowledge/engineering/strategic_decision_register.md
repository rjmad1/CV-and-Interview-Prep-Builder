---
id: OKF-ENG-001
type: engineering_standard
title: Strategic Decision Register
owner: Principal Architect Agent
last_updated: 2026-06-20
depends_on: ["OKF-BUS-001", "OKF-BUS-002", "OKF-BUS-003", "OKF-BUS-004"]
tags: [adr, decisions, tradeoffs]
---

# Strategic Decision Register

This register documents key architectural, product, AI, and security decisions that must be aligned before MVP development.

---

## 1. Decision Prioritization Matrix

Decisions are prioritized by **Urgency** (Immediate, Near-term, Deferred) and **Impact on SaaS Migration** (Low, Medium, High).

| Decision Code | Strategic Decision | Urgency | SaaS Impact | Core Trade-offs |
|---|---|---|---|---|
| **SDR-ARCH-01** | **Local-First vs. Cloud-Only Architecture** | Immediate | High | Offline availability and user privacy vs. cross-device synchronization latency. |
| **SDR-DB-02** | **SQLite vs. PostgreSQL for MVP** | Immediate | High | Ease of local installation/packaging vs. multi-tenant scaling database migrations. |
| **SDR-AI-03** | **Local Embeddings Engine vs. Cloud Embedding API** | Near-term | Medium | Zero network dependency/performance cost vs. device hardware limitations (RAM, CPU). |
| **SDR-DOC-04** | **XML-Direct Manipulation vs. External Formatting API** | Immediate | Low | Complete control over style preservation vs. complex development overhead. |
| **SDR-AUTH-05** | **Production JWT Authentication & Tenant Context** | Immediate | High | Decoupled token signature checking latency vs. public access security risk. |
| **SDR-DB-06** | **Asynchronous vs. Synchronous DB Operations** | Near-term | High | Concurrency event-loop blocking vs. repo & Alembic migration refactoring overhead. |
| **SDR-VEC-07** | **Secure Tenant Partitioning in Vector Store** | Immediate | High | Strict Named Partitions indexing configuration vs. soft metadata filtering leakage risks. |
| **SDR-AI-08** | **Token Overlap Grounding & Local fallback** | Near-term | Medium | Local model footprint & CPU load vs. lexical loophole hallucination risks. |
| **SDR-INF-09** | **Clustered High-Availability Cloud Infra** | Deferred | High | Operational complexity and hosting budget costs vs. single-node outage risk. |
| **SDR-TEST-10** | **Unified Turborepo Workspace Testing Gate** | Near-term | Medium | Inter-workspace testing runtime setup vs. fragmented tests & regressions risk. |

---

## 2. Strategic Decision Register

### SDR-ARCH-01: Local-First vs. Cloud-Only Architecture
*   **Why it matters:** Determines CIS platform placement, offline capabilities, and compliance postures.
*   **Available Options:**
    1.  *Option A:* Cloud-only backend (Standard API + Web App).
    2.  *Option B:* Local-first (Local DB, SQLite, local RAG/API running as a background service, React Native).
*   **Tradeoffs:** Option B ensures 100% data privacy and offline runtime but introduces packaging complexity and limits cross-device sync.
*   **Recommended Option:** Option B (Local-first) for the MVP, with strict API separation to enable SaaS migration in Phase 2.
*   **SaaS Implications:** The backend services (FastAPI) must run on localhost for the MVP and be easily packageable/deployable to AWS/Heroku for SaaS.

### SDR-DB-02: SQLite vs. PostgreSQL for MVP
*   **Why it matters:** Affects application setup complexity and deployment portability.
*   **Available Options:**
    1.  *Option A:* PostgreSQL (forces developers/users to run a Docker database container).
    2.  *Option B:* SQLite (single file, zero configuration, embedded in the application).
*   **Tradeoffs:** SQLite requires zero setup but lacks multi-tenant concurrency and row-level security out of the box.
*   **Recommended Option:** Option B (SQLite) utilizing SQLModel/SQLAlchemy ORM.
*   **SaaS Implications:** ORM schema classes must not use SQLite-specific features (e.g., custom JSON operators) so they can switch to PostgreSQL via connection string modification.

### SDR-AI-03: Local Embeddings Engine vs. Cloud Embedding API
*   **Why it matters:** Controls indexing performance and offline capability.
*   **Available Options:**
    1.  *Option A:* OpenAI/Cohere cloud embeddings.
    2.  *Option B:* Local `sentence-transformers` running in a Python service.
*   **Tradeoffs:** Local embeddings are offline-ready but increase app footprint and resource utilization.
*   **Recommended Option:** Option B (Local embeddings using a lightweight model like `all-MiniLM-L6-v2`) with a configuration switch to allow Cloud API injection.
*   **SaaS Implications:** Cloud deployment will swap the local embedding module with a cloud service to minimize container sizes.

### SDR-DOC-04: XML-Direct Manipulation vs. External Formatting API
*   **Why it matters:** Crucial for the document-fidelity core differentiator.
*   **Available Options:**
    1.  *Option A:* Standard DOCX to HTML conversion APIs (which often degrade original layout structures).
    2.  *Option B:* Direct XML node extraction and replacement within the `document.xml` file.
*   **Tradeoffs:** Direct XML manipulation is complex and prone to structural syntax errors but guarantees perfect font, layout, and style preservation.
*   **Recommended Option:** Option B (Direct XML manipulation using python-docx and raw zipfile extraction utility scripts).
*   **SaaS Implications:** Keeps generation logic CPU-bound and packageable as stateless serverless functions (e.g., AWS Lambda).

### SDR-AUTH-05: Production JWT Authentication & Tenant Context
*   **Why it matters:** Standard local setups bypass authorization. In production, endpoints must be authenticated and inject unique user IDs to session contexts for Row-Level Security (RLS).
*   **Available Options:**
    1.  *Option A:* Maintain open developer mock credentials logic in staging/production.
    2.  *Option B:* Decode and validate JWT signatures locally using cached IdP public keys, and bind `user_id` to PostgreSQL transaction context.
*   **Tradeoffs:** Option B adds small decryption overhead but secures sensitive user PII from cross-tenant leakage.
*   **Recommended Option:** Option B.
*   **SaaS Implications:** Non-negotiable security prerequisite for multi-tenant deployments.

### SDR-DB-06: Asynchronous vs. Synchronous DB Operations
*   **Why it matters:** Synchronous blocking database queries stall the FastAPI single-threaded event loop.
*   **Available Options:**
    1.  *Option A:* Standard synchronous SQLAlchemy query sessions.
    2.  *Option B:* Asynchronous sessions using `asyncpg` driver and `create_async_engine` wrapper.
*   **Tradeoffs:** Option B requires refactoring all repositories to async/await syntax and managing double migration setups in Alembic.
*   **Recommended Option:** Option B.
*   **SaaS Implications:** Maximizes concurrent throughput and prevents pooling deadlock.

### SDR-VEC-07: Secure Tenant Partitioning in Vector Store
*   **Why it matters:** Single-collection vector lookups relying only on metadata filters ("soft isolation") are vulnerable to cross-tenant leakages.
*   **Available Options:**
    1.  *Option A:* Rely solely on `user_id` metadata filter conditions.
    2.  *Option B:* Implement Qdrant Named Partitions (hard index slicing), wrapper validation middleware, and payload envelope encryption.
*   **Tradeoffs:** Option B adds partitioning configuration overhead but guarantees mathematical tenant boundary isolation.
*   **Recommended Option:** Option B.
*   **SaaS Implications:** Eliminates vector search data leakage risks.

### SDR-AI-08: Token Overlap Grounding & Local Fallback
*   **Why it matters:** Naive word lexical fallback during offline runs creates validation bypasses. Mock interview questions need factual check loops.
*   **Available Options:**
    1.  *Option A:* Lexical single-word fallbacks and unverified interview grading.
    2.  *Option B:* Enforce strict token overlap thresholds (Jaccard index >= 0.50), configure local `SentenceTransformers` fallback, and add a grounding verification node in the interview LangGraph.
*   **Tradeoffs:** Option B increases local container size and memory footprints.
*   **Recommended Option:** Option B.
*   **SaaS Implications:** Guarantees factual citation audits on all resume/interview tasks.

### SDR-INF-09: Clustered High-Availability Cloud Infra
*   **Why it matters:** Single-node RDS, Redis, and vector services represent single-points-of-failure (SPOF) with zero durability guarantees.
*   **Available Options:**
    1.  *Option A:* Deploy single ECS tasks and basic database instances.
    2.  *Option B:* Upgrade to Multi-AZ RDS with read replicas, replicate Redis clusters, configure Qdrant clustered tasks, and autoscale worker fleets.
*   **Tradeoffs:** Option B multiplies ongoing infrastructure costs.
*   **Recommended Option:** Option B.
*   **SaaS Implications:** Foundation of service SLAs and system resiliency.

### SDR-TEST-10: Unified Turborepo Workspace Testing Gate
*   **Why it matters:** Fragmented workspace tests fail to prevent regressions in API-to-Web integration.
*   **Available Options:**
    1.  *Option A:* Run backend tests and frontend tests manually in isolation.
    2.  *Option B:* Setup Vitest/Playwright, map pytest into pnpm workspace tasks, execute all concurrently via `turbo run test`, and enforce 80% coverage limits.
*   **Tradeoffs:** Option B requires configuring multi-runtime execution engines in CI containers.
*   **Recommended Option:** Option B.
*   **SaaS Implications:** Enforces system-wide stability safeguards.

---

## 3. Dependency Relationships

```
+------------------------------------+
|   SDR-ARCH-01: Local-First         |
+------------------------------------+
                  |
                  |-- Dictates --> +------------------------------------+
                  |                |   SDR-DB-02: SQLite Data Storage   |
                  |                +------------------------------------+
                  |
                  |-- Dictates --> +------------------------------------+
                                   |   SDR-AI-03: Local Embeddings      |
                                   +------------------------------------+

+------------------------------------+
|     SDR-DB-06: Async Sessions      |
+------------------------------------+
                  |
                  |-- Enables ---> +------------------------------------+
                                   |   SDR-AUTH-05: Secure RLS Injection|
                                   +------------------------------------+
                                                     |
                                                     v
                                   +------------------------------------+
                                   |   SDR-VEC-07: Qdrant Partitioning  |
                                   +------------------------------------+
                                                     |
                                                     v
                                   +------------------------------------+
                                   |   SDR-AI-08: Grounding Validation  |
                                   +------------------------------------+
```
*   Choosing a **Local-First** setup (`SDR-ARCH-01`) directly requires **SQLite** (`SDR-DB-02`) for local relational data storage and **Local Embeddings** (`SDR-AI-03`) to enable offline semantic processing.
*   **XML Manipulation** (`SDR-DOC-04`) operates independently of architecture but must remain stateless to easily move from local to cloud execution.
*   Transitioning database operations to **Async Sessions** (`SDR-DB-06`) is required to safely inject **JWT Tenant RLS context** (`SDR-AUTH-05`) without blocking event loop transactions, which works alongside **Qdrant Named Partitions** (`SDR-VEC-07`) and **Grounding Validation Gates** (`SDR-AI-08`) to protect multi-tenant personal assets.
*   **Unified Testing Gates** (`SDR-TEST-10`) run concurrently to check consistency across all database, security, and rendering layers.

