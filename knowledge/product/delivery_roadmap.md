---
id: OKF-BUS-002
type: business_capability
title: Delivery Roadmap
owner: Product Manager Agent
last_updated: 2026-06-17
depends_on: ["OKF-BUS-001"]
tags: [roadmap, milestones, dependencies]
---

# Delivery Roadmap & Milestone Framework

This document outlines the execution roadmap, phase breakdowns, dependency structures, and governance decision gates for the **Career Intelligence Studio (CIS)** project.

---

## 1. Roadmap Overview

The delivery lifecycle is structured into three local-first delivery phases followed by a SaaS transition phase. Each phase operates with strict entrance and exit criteria.

```
       [ Phase 1: Foundation ] ---- (Gate 1: Schema Sign-off)
                 |
                 v
     [ Phase 2: Core Engineering ] -- (Gate 2: RAG & Fidelity Ready)
                 |
                 v
   [ Phase 3: Integration & MVP ] --- (Gate 3: Offline Release Ready)
                 |
                 v
       [ Phase 4: SaaS Migration ] -- (Gate 4: Multi-Tenant Sign-off)
```

---

## 2. Phase Breakdown

### Phase 1: Local Foundation & Schema Baseline
*   **Target Duration:** Weeks 1–3
*   **Focus:** Establish local data layers, standard API models, and initial parsing capabilities.
*   **Parallel Workstreams:**
    *   *Stream A:* Database Schema design & ORM mapping (SQLite).
    *   *Stream B:* Basic React Native/Expo project configuration and UI component boilerplate.
*   **Entry Criteria:**
    *   Approved `OKF-BUS-001` (Master Software Factory Blueprint).
    *   Development environment specifications finalized.
*   **Exit Criteria:**
    *   SQLite database initialized with all career-history and document tracking tables.
    *   React Native client running locally on simulators.

### Phase 2: Core Engineering (Fidelity & Grounding)
*   **Target Duration:** Weeks 4–7
*   **Focus:** Build the high-fidelity DOCX engine and the local-first RAG pipeline.
*   **Parallel Workstreams:**
    *   *Stream A:* Document processing, placeholder replacement, and layout safety auditing.
    *   *Stream B:* Semantic indexing, local embedding generation, and source citation extraction.
*   **Entry Criteria:**
    *   Successful exit of Phase 1.
    *   Approved document-fidelity performance test suite.
*   **Exit Criteria:**
    *   DOCX files can be read and written with 100% layout preservation.
    *   Local RAG service retrieves matching text chunks with citations.

### Phase 3: Integration & Human-in-the-Loop Workspace
*   **Target Duration:** Weeks 8–11
*   **Focus:** Bind the frontend UI to the backend engine and support live, human-reviewed document export.
*   **Parallel Workstreams:**
    *   *Stream A:* Inline document editor, RAG suggestions drawer, and citations validator UI.
    *   *Stream B:* System integration tests and performance optimizations (offline caching).
*   **Entry Criteria:**
    *   Successful exit of Phase 2.
    *   Grounding and citation schemas finalized.
*   **Exit Criteria:**
    *   Full offline end-to-end flow verified: User loads a resume template, applies RAG-driven changes, edits, and exports a layout-perfect DOCX file.

### Phase 4: SaaS Migration Transition
*   **Target Duration:** Weeks 12+ (Deferred)
*   **Focus:** Transition to multi-tenant cloud operations.
*   **Parallel Workstreams:**
    *   *Stream A:* Implement OAuth2 authentication.
    *   *Stream B:* SQLite to PostgreSQL schema migration, cloud file storage mapping (S3).
*   **Entry Criteria:**
    *   Successful release of the offline MVP.
    *   Infrastructure environment ready.
*   **Exit Criteria:**
    *   Production deployment verified with secure remote synchronization.

---

## 3. Milestone Framework

| Milestone | Code | Description | Verification Method |
|---|---|---|---|
| **M1: Database & Schema Sign-off** | `MS-001` | Core database tables and ORM classes mapped. | SQLite migration scripts execute with zero warnings. |
| **M2: Fidelity Preservation Baseline** | `MS-002` | Successful parsing and re-saving of complex DOCX files. | Structural layout comparison script shows zero layout drift. |
| **M3: Grounded RAG Pipeline** | `MS-003` | Context-grounded generation system matches text to sources. | Test suites verify every suggested bullet point has a valid source ID. |
| **M4: Interactive MVP Workspace** | `MS-004` | Working local app with inline editor and audit log. | End-to-end manual test run completes completely offline. |
| **M5: Production SaaS Ready** | `MS-005` | Cloud deployment with secure DB and auth active. | Penetration test & load test validation sign-off. |

---

## 4. Dependency Matrix

| Phase | Module | Primary Dependencies | Parallelizable Tasks |
|---|---|---|---|
| **Phase 1** | Local DB Schema | None | SQLite database model setup, DB migrations |
| **Phase 1** | Client UI Boilerplate | None | Frontend component design, Mock UI views |
| **Phase 2** | DOCX Engine | Local DB Schema | XML manipulation libraries, styling validations |
| **Phase 2** | Local RAG Pipeline | Local DB Schema | Vector DB setup, sentence-transformers indexing |
| **Phase 3** | Workspace UI | DOCX Engine, Local RAG Pipeline | Binding suggestion panels to editor, review board |
| **Phase 3** | Document Exporter | DOCX Engine, Workspace UI | Output serialization, export progress bar |
| **Phase 4** | Cloud Sync Service | Workspace UI, Local DB Schema | Sync schemas, PostgreSQL configurations |

---

## 5. Decision Gates

### Decision Gate 1: Schema Validation & ORM Compliance
*   **Timing:** End of Phase 1
*   **Goal:** Verify database structure is aligned with SaaS requirements (PostgreSQL compatibility).
*   **Required Sign-off:** Lead Database Engineer & Principal Architect.
*   **Failing Condition:** SQLite schema uses custom SQLite-specific data formats that cannot be directly mapped to PostgreSQL.

### Decision Gate 2: RAG Accuracy & Grounding Threshold
*   **Timing:** Mid Phase 2 (Week 6)
*   **Goal:** Ensure LLM-generated recommendations meet the zero-fabrication quality baseline.
*   **Required Sign-off:** AI Quality Lead.
*   **Failing Condition:** The RAG system proposes claims that cannot be traced to source documents, or hallucination rates exceed the 0% threshold.

### Decision Gate 3: Document Fidelity Clearance
*   **Timing:** End of Phase 2 (Week 7)
*   **Goal:** Confirm the system produces visual output matching the original design layouts.
*   **Required Sign-off:** Design Lead & QA Lead.
*   **Failing Condition:** Any pixel-level drift or styling loss on test resume templates (DOCX).

### Decision Gate 4: MVP Offline Sign-off
*   **Timing:** End of Phase 3 (Week 11)
*   **Goal:** Approve the offline product bundle for customer distribution.
*   **Required Sign-off:** Product Owner.
*   **Failing Condition:** Critical operations (editing, saving, exporting) fail to execute without internet connectivity.
