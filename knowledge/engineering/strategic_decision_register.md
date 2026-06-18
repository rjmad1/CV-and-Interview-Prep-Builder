---
id: OKF-ENG-001
type: engineering_standard
title: Strategic Decision Register
owner: Principal Architect Agent
last_updated: 2026-06-17
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
```
*   Choosing a **Local-First** setup (`SDR-ARCH-01`) directly requires **SQLite** (`SDR-DB-02`) for local relational data storage and **Local Embeddings** (`SDR-AI-03`) to enable offline semantic processing.
*   **XML Manipulation** (`SDR-DOC-04`) operates independently of architecture but must remain stateless to easily move from local to cloud execution.
