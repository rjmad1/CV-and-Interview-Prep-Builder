# Career Intelligence Studio - Product Backlog & Estimation Matrix

This backlog defines the engineering implementation roadmap, grouped into 10 Sprints representing the full development timeline. Each task includes an ID, description, Story Point (SP) estimate (1 SP = 4 hours of focus work), and a Definition of Done (DoD).

---

## Sprint 1: Local Foundation & Environment Setup
**Theme:** Setup root workspace, configuration pipelines, and base applications.

| Task ID | Component | Task Description | Estimate | Definition of Done |
|---|---|---|---|---|
| TS-INF-001 | Infrastructure | Initialize Turborepo configurations at workspace root. | 1 SP | `turbo.json` is created and configured. |
| TS-INF-002 | Infrastructure | Setup pnpm workspace configuration. | 1 SP | `pnpm-workspace.yaml` maps all workspace apps/packages. |
| TS-INF-003 | Infrastructure | Configure root `tsconfig.json` compiler options. | 1 SP | Type checking validates successfully at the root level. |
| TS-INF-004 | Backend | Setup Poetry env and dependency package rules. | 2 SP | `pyproject.toml` compiles and installs all requirements. |
| TS-INF-005 | Backend | Initialize FastAPI base engine and main app entry point. | 2 SP | HTTP GET `/` returns service status and health. |
| TS-INF-006 | Frontend | Initialize Next.js 15 template application. | 2 SP | Next.js server starts on port 3000 with TypeScript. |
| TS-INF-007 | Docker | Write compose configuration for local service stacks. | 2 SP | `docker compose up` starts Postgres, Redis, and Qdrant. |
| TS-INF-008 | CI/CD | Setup initial GitHub Actions validation pipeline. | 2 SP | Pipeline runs linting, formatting, and dummy tests. |

---

## Sprint 2: Core Data Engine & Authentication
**Theme:** Model relational schemas, setup database migrations, and construct security contexts.

| Task ID | Component | Task Description | Estimate | Definition of Done |
|---|---|---|---|---|
| TS-DB-001 | Database | Define user and account relational tables. | 2 SP | PostgreSQL migration creates users schema correctly. |
| TS-DB-002 | Database | Map experience, skills, and certifications tables. | 3 SP | SQLAlchemy schema reflects models. |
| TS-DB-003 | Security | Implement PostgreSQL Row-Level Security (RLS) policies. | 5 SP | Direct queries from non-owner tenants return zero rows. |
| TS-DB-004 | Auth | Setup OAuth2 Password flow and token encoding. | 3 SP | User logins return valid JWT signatures with scopes. |
| TS-DB-005 | Auth | Abstract security manager provider for SaaS readiness. | 3 SP | Local mock security switches to cloud Auth0 by setting env. |

---

## Sprint 3: Document Ingestion & Parse Pipeline
**Theme:** Implement parsing utilities for DOCX and PDF and configure celery workers.

| Task ID | Component | Task Description | Estimate | Definition of Done |
|---|---|---|---|---|
| TS-DOC-001 | Ingestion | Implement PDF text parser using `pypdf`. | 3 SP | Text successfully extracted from multi-column PDFs. |
| TS-DOC-002 | Ingestion | Implement DOCX text extractor. | 3 SP | Extract raw paragraphs and bullet segments. |
| TS-DOC-003 | Worker | Setup Celery tasks for asynchronous ingestion processing. | 4 SP | API returns `202 ACCEPTED` and tasks execute in background. |
| TS-DOC-004 | Graph | Connect Document Processing LangGraph workflow. | 5 SP | Graph runs scan, parse, classify, and chunk nodes in sequence. |

---

## Sprint 4: Semantic Indexing & Vector Search
**Theme:** Configure local embeddings, index chunks in Qdrant, and implement search.

| Task ID | Component | Task Description | Estimate | Definition of Done |
|---|---|---|---|---|
| TS-AI-001 | Retrieval | Integrate LiteLLM/local sentence-transformers provider. | 3 SP | Vector embeddings generated for mock paragraphs. |
| TS-AI-002 | Retrieval | Setup Qdrant collection initialization scripts. | 3 SP | Collection `career_chunks` created with cosine distance. |
| TS-AI-003 | Retrieval | Implement dense similarity search query handlers. | 3 SP | Returns top-K nearest chunks based on cosine score. |
| TS-AI-004 | Retrieval | Implement hybrid search (dense Qdrant + sparse BM25). | 5 SP | Merged query returns RRF-fused results matching user query. |

---

## Sprint 5: Evidence Grounding & Traceability
**Theme:** Enforce citation validation, audit trails, and anti-hallucination policies.

| Task ID | Component | Task Description | Estimate | Definition of Done |
|---|---|---|---|---|
| TS-EV-001 | Grounding | Design the structured Evidence Schema JSON payload. | 2 SP | Matches schema layout with citation IDs and confidence. |
| TS-EV-002 | Grounding | Implement LLM constraint prompts enforcing citations. | 5 SP | Model output contains matching citation brackets for facts. |
| TS-EV-003 | Grounding | Write validation script matching output claims to source. | 5 SP | Reject suggestions if similarity score to source < 0.8. |
| TS-EV-004 | Grounding | Log audit records and hallucination events to database. | 3 SP | Failed validation records mapped to `hallucination_events`. |

---

## Sprint 6: DOCX Fidelity Preservation & AST Engine
**Theme:** Implement direct XML node replacement to preserve layouts.

| Task ID | Component | Task Description | Estimate | Definition of Done |
|---|---|---|---|---|
| TS-FID-001 | Fidelity | Write utility to unzip DOCX package and extract XML structure. | 3 SP | Access and edit `word/document.xml` nodes directly. |
| TS-FID-002 | Fidelity | Map document AST layout and section boundaries. | 5 SP | Correctly parses paragraph runs and bullet listings. |
| TS-FID-003 | Fidelity | Implement target placeholders interpolation script. | 5 SP | Target text replaced inside content control boxes. |
| TS-FID-004 | Fidelity | Run layout regression tests comparing before/after. | 5 SP | Exported file passes visual verification tests. |

---

## Sprint 7: CV Optimization Workflows
**Theme:** Integrate the optimization LangGraph workflow and connect frontend dashboard.

| Task ID | Component | Task Description | Estimate | Definition of Done |
|---|---|---|---|---|
| TS-OPT-001 | Graph | Construct Resume Optimization LangGraph workflow. | 5 SP | Complete nodes (select, optimize, validate, diff, export). |
| TS-UI-001 | UI | Create Dashboard view in Next.js web application. | 3 SP | Shell navigation maps all views on port 3000. |
| TS-UI-002 | UI | Build resume editor interface with inline change highlights. | 5 SP | Side-by-side diff view renders changes. |
| TS-UI-003 | UI | Bind frontend form selectors to `/api/resume/generate`. | 4 SP | Triggers backend generation and updates state. |

---

## Sprint 8: ATS Explainability & Match Metrics
**Theme:** Implement match score calculations, keyword analysis, and readability reports.

| Task ID | Component | Task Description | Estimate | Definition of Done |
|---|---|---|---|---|
| TS-ATS-001 | Scoring | Write ATS score calculation algorithm. | 3 SP | Score matches keyword density and semantic vector projection. |
| TS-ATS-002 | Analysis | Implement detailed readability checker. | 3 SP | Identifies passive voice, long sentences, and buzzwords. |
| TS-ATS-003 | UI | Create ATS report page detailing coverage gaps. | 4 SP | Renders score gauges and lists missing keywords. |

---

## Sprint 9: Mock Interview & Coach Simulator
**Theme:** Implement LangGraph interview pipelines and coaching engine.

| Task ID | Component | Task Description | Estimate | Definition of Done |
|---|---|---|---|---|
| TS-INT-001 | Graph | Build Interview Preparation LangGraph state machine. | 5 SP | Cycles through question, response, and coaching nodes. |
| TS-INT-002 | Backend | Implement `/api/interview` REST controllers. | 3 SP | Handles session creation, answer logging, and report views. |
| TS-UI-004 | UI | Create Interactive Interview Prep dashboard. | 5 SP | Audio recording / text inputs capture response text. |

---

## Sprint 10: SaaS Transition & AWS Deployment
**Theme:** Setup Terraform infrastructure, configure CI/CD pipelines, and run final QA tests.

| Task ID | Component | Task Description | Estimate | Definition of Done |
|---|---|---|---|---|
| TS-DEP-001 | IAC | Run Terraform init and validate scripts. | 3 SP | Modules check validates with zero syntax errors. |
| TS-DEP-002 | Deployment| Setup ECS Fargate Task execution templates. | 4 SP | API and web images deploy to AWS container repositories. |
| TS-QA-001 | QA | Run end-to-end regression validation. | 5 SP | Core workflow passes completely offline and online. |

---

## Tasks 100 - 1000: Operational Scaling & Feature Expansion
For the full scale product delivery, this backlog is mapped to an automated issue-tracker system (e.g. Jira/Linear) containing discrete tasks covering:
- Unit test coverage expansion (200 tasks)
- Styling adjustments and UI responsiveness edge cases (150 tasks)
- Custom DOCX content control nodes support (100 tasks)
- Security hardening, secret rotation, and penetration test mitigations (100 tasks)
- Localization and multi-language template setups (100 tasks)
- RAG evaluation and prompt performance tuning (150 tasks)
- Cross-browser capability adjustments (100 tasks)
