---
id: OKF-BUS-001
type: business_capability
title: Master Software Factory Blueprint
owner: Principal Architect Agent
last_updated: 2026-06-20
depends_on: []
tags: [blueprint, governance, architecture, saas-readiness]
---

# Master Software Factory Blueprint

**Blueprint Version:** v1.0
**Project Name:** Career Intelligence Studio (CIS)
**Date:** 2026-06-17

---

## 1. Project Classification

*   **System Type:** Local-first cross-platform application with optional cloud integration and decoupled AI-orchestration middleware.
*   **Engineering Class:** High-reliability document processing & context-grounded AI-assisted agent.
*   **Scale Target:** 
    *   *Phase 1 (MVP):* Single-user offline desktop/mobile database and execution (zero network dependency for core resume operations).
    *   *Phase 2 (SaaS):* Multi-tenant cloud application with cloud-hosted LLM endpoints, high-availability document services, and remote user workspace synchronization.
*   **Complexity Level:** Medium-High (Requires precise XML/DOCX parsing, localized vector embeddings/RAG, and deterministic document generation layers).

---

## 2. Business Objectives

*   **Document Fidelity Preservation:** Ensure that the original design, margins, styles, fonts, and layouts of pre-existing user CV/resume templates are preserved exactly after AI-driven text refinement.
*   **Zero Fabrication (Anti-Hallucination):** Enforce strict evidence-grounding controls. The system must guarantee that every generated CV entry, bullet point, or cover letter statement is explicitly traceable back to verified historical records (employment contracts, reference letters, performance reviews).
*   **Offline Privacy Baseline:** Support complete local operations to protect sensitive career records (e.g., compensation figures, proprietary projects, contact details) from third-party server exposure.
*   **Frictionless Future SaaS Migration:** Build the MVP local-first architecture on core interfaces and schemas that can run in a cloud-hosted context without core rewrite.

---

## 3. Product Scope

### In-Scope (MVP Phase)
*   **Career Workspace Repository:** A secure local storage structure acting as the authoritative repository of the user's verified career data (the "Career Archive").
*   **Document Processing Engine:** Parser and template manager capable of scanning existing DOCX/PDF templates, extracting placeholders, injecting structured text changes, and rendering polished outputs.
*   **Evidence-Grounding & Traceability:** A local-first RAG pipeline that tags every generated fragment with metadata linking back to a source artifact in the Career Archive.
*   **Interactive Review Workspace:** A human-in-the-loop interface where the user must review, edit, and manually approve any AI-suggested content before export.
*   **Local Database Sync:** SQLite implementation storing data schemas that are structurally aligned with standard relational databases (e.g., PostgreSQL).

### Out-of-Scope (Deferred to SaaS Phase)
*   **Multi-tenant Authentication & Authorization:** Multi-user logins, role-based access control (RBAC), and user organizations.
*   **Cloud Synchronized Workspace:** Automatic cloud backups, collaborative document editing, or cross-device real-time sync.
*   **Cloud API Integrations:** Direct native job portal integrations (e.g., LinkedIn API, Indeed API) for automated submissions.
*   **Multi-user Collaboration:** Peer review channels, recruiter sharing portals, and live document sharing links.

---

## 4. Major Workstreams

```
+-------------------------------------------------------------------------------+
|                        WORKSTREAM 1: DATA ACCELERATION                        |
|   - Career Workspace Schema & Asset Management (SQLite / File System)          |
+-------------------------------------------------------------------------------+
                                        |
+---------------------------------------v---------------------------------------+
|                    WORKSTREAM 2: AI & GROUNDING ENGINE                        |
|   - RAG Architecture, Source Document Chunking, Embedding, & Audit-Trail      |
+-------------------------------------------------------------------------------+
                                        |
+---------------------------------------v---------------------------------------+
|                 WORKSTREAM 3: DOCUMENT FIDELITY PIPELINE                      |
|   - DOCX Template Parser, Placeholder Interpolator, & Output Generator       |
+-------------------------------------------------------------------------------+
                                        |
+---------------------------------------v---------------------------------------+
|                  WORKSTREAM 4: EXPERIENCE INTERFACE                           |
|   - Cross-Platform UI (React Native / Expo), Editor, and Auditing Board       |
+-------------------------------------------------------------------------------+
```

---

## 5. Critical Path

1.  **Phase 0.5: Schema Definition & Grounding Rules**
    *   Finalize Career Workspace JSON schema and SQLite relation maps.
    *   Verify mapping structure against SaaS expectations (PostgreSQL schemas).
2.  **Phase 1.0: Local Parsing & RAG Engine**
    *   Implement DOCX parser preserving XML styles.
    *   Construct RAG vector index for local document retrieval.
3.  **Phase 1.5: Evidence Link Verification**
    *   Build source tracking and citation rendering components.
    *   Validate hallucination detection rules.
4.  **Phase 2.0: Interactive Workspace Implementation**
    *   Develop React Native workspace for document template selection and inline editing.
    *   Connect UI controls to local grounding database.
5.  **Phase 2.5: User Acceptance & Final Export Testing**
    *   Verify exported document fidelity against input templates.
    *   Validate complete offline runtime execution.

---

## 6. Dependency Map

### External Dependencies
*   **FastAPI & SQLite:** Local app backend. High dependency for service APIs; chosen for simple deployment and seamless transitions to PostgreSQL.
*   **LLM Providers (Local/Cloud):** Execution of text refinement models. Hard dependency on reliable prompt processing and JSON Schema compliance.
*   **React Native / Expo:** Client UI framework. High dependency for styling and deployment across Desktop/Mobile.
*   **Python `python-docx` / XML Libraries:** Critical dependency for handling complex file templates.

### Internal Module Dependencies
*   **AI Engine** depends on **Career Workspace DB** (data availability) and **Prompt Templates**.
*   **Document Generator** depends on **AI Engine** output (refined text) and **DOCX Template Files** (styling rules).
*   **UI Client** depends on **AI Engine** and **Document Generator** APIs.

---

## 7. Delivery Model

*   **Execution Strategy:** Iterative Agile-based development with weekly milestone checks.
*   **Workspace Standard:** Standardized monorepo with clean separation between the frontend (React Native/Expo app) and backend (FastAPI, SQLite, and Python dependencies).
*   **Continuous Integration (CI):** Local validation tests covering XML parsing, schema validation, and citation matching on every push.

---

## 8. Governance Framework

*   **Hallucination Penalty Governance:** Any content generated by the AI without an explicit source citation score exceeding the grounding threshold must be flagged and prevented from auto-inclusion.
*   **Document Quality Metrics:** Exported files must maintain visual layout scores (structure alignment, font families, line heights, and margin measurements) matching the original source template.
*   **Architectural Changes (ADRs):** Any deviation from the local-first, SQLite-backed, or RAG-based schemas must be registered in the ADR directory with explicit SaaS impact analysis.
*   **Security Baseline:** No customer credentials or private documents may be transmitted to external servers except through explicitly consented cloud model endpoints.

---

## 9. SaaS-Readiness Rules

To ensure that the Transition from a single-user offline system to a multi-tenant SaaS application does not require a rewrite:
1.  **Database Decoupling:** Use SQLAlchemy or SQLModel ORM mappings in FastAPI to ensure the SQLite schema can target a PostgreSQL database simply by changing the connection string.
2.  **Stateless Backends:** Keep the FastAPI service layer completely stateless. All persistent states must reside in the database or the local storage volume.
3.  **Authentication Abstraction:** Wrap local mock security contexts in a security provider interface that can be swapped out for an OAuth2/OIDC/Auth0 provider.
4.  **Storage Isolation:** Store user documents under a structured workspace folder path (`/workspaces/{user_id}/...`) to allow simple migration to S3 or secure cloud object storage.
5.  **Asynchronous Operations:** Implement async database query boundaries using `AsyncSession` to prevent database network calls from blocking the API event loop.
6.  **Hard Vector Isolation:** Structure chunk storage and search collections using Qdrant Named Partitions rather than soft metadata filters to ensure mathematically bounded query isolation.
7.  **Unified Test Verification:** Wire all unit, integration, and E2E test suites into root workspace runner commands (`turbo run test`) to block compromised or regression-prone deploys.

---

## 10. Recommended Phase Sequencing

```
+---------------------------+       +---------------------------+       +---------------------------+
|          PHASE 1          |       |          PHASE 2          |       |          PHASE 3          |
|  Local Workspace Setup    |       |   Document Fidelity &     |       |    Grounding Engine &     |
|  - Define OKF baseline    |======>|     Placeholder Engine    |======>|     Local RAG Pipeline    |
|  - Setup local DB schemas |       |  - DOCX parsing & rendering|      |  - Vector embedding index |
|  - Init React Native client|      |  - Layout safety checks   |       |  - Hallucination audits   |
+---------------------------+       +---------------------------+       +---------------------------+
                                                                                      ||
                                                                                      ||
+---------------------------+       +---------------------------+                     ||
|          PHASE 6          |       |          PHASE 5          |                     ||
|       SaaS Expansion      |       |  Integration & Workspace  |                     ||
|  - Multi-tenancy setup    |<======|  - Connect UI with grounding|<====================+
|  - PostgreSQL & Auth0     |       |  - Human-in-the-loop view |
|  - Cloud Object Storage   |       |  - End-to-end user export |
+---------------------------+       +---------------------------+
```
