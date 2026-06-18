---
id: OKF-BUS-003
type: business_capability
title: MVP Scope Optimization
owner: Product Manager Agent
last_updated: 2026-06-17
depends_on: ["OKF-BUS-001", "OKF-BUS-002"]
tags: [mvp, scope, prioritization]
---

# MVP Scope Optimization

This document outlines the product scope optimizations, capability prioritization matrices, and deferred backlog definitions for the **Career Intelligence Studio (CIS)** MVP, target-scheduled for an 11–12 week development cycle.

---

## 1. Capability Prioritization Matrix

Capabilities are prioritized using MoSCoW (Must, Should, Could, Won't) and evaluated based on **Technical Complexity (TC)** and **Business Differentiator Value (BDV)** (Scale: Low, Medium, High).

| Capability Name | Category | MoSCoW | TC | BDV | Evidence-Based Prioritization Rationale |
|---|---|---|---|---|---|
| **Career Workspace Storage** | Core Platform | **Must** | Low | High | Foundational data layer. Stores verified achievements required by RAG for citation generation. |
| **DOCX Template Engine** | Document Processing | **Must** | High | High | Fundamental customer expectation. Resumes must render with 100% template styling fidelity. |
| **Citation & Traceability Engine** | AI Safety | **Must** | Medium | High | Key product differentiator. Restricts LLM from generating ungrounded claims. |
| **Local Vector DB Indexing** | AI Platform | **Must** | Medium | Medium | Necessary to support semantic matching and offline citation resolution. |
| **Interactive Editor Workspace** | UI / UX | **Must** | Medium | High | Human-in-the-loop validation interface. Crucial for reviewing and final-approving suggestions. |
| **Cloud Synchronized Workspace** | SaaS Readiness | **Won't** | High | Low (MVP) | Multi-tenant cloud sync is not required for a single-user offline MVP. |
| **Job Portal API Integrations** | Automation | **Won't** | Medium | Low (MVP) | Can be bypassed with simple web redirects. High API churn makes maintenance expensive. |
| **Multi-user Workspace Sharing** | Collaboration | **Won't** | High | Low (MVP) | Sharing capabilities can be resolved via standard DOCX/PDF export sharing. |

---

## 2. MVP Scope (11–12 Week Target)

The target MVP scope focuses exclusively on **local-first** execution and **zero-fabrication** document transformation.

### 1. The Career Archive (Local Workspace)
*   User profiles storing raw, verified experience segments (employment dates, official job titles, project descriptions).
*   Document catalog linking local PDFs/DOCXs as verification evidence.

### 2. High-Fidelity Template Processor
*   XML parser that extracts standard content controls and layout definitions from input DOCX templates.
*   Replacement engine that updates text blocks inside XML controls without mutating formatting styles.

### 3. Traceable AI Generation (Grounding Hub)
*   Local semantic search matching candidate text suggestions to original resume database segments.
*   Structured prompts enforcing model outputs to cite source IDs.

### 4. Interactive Review Board
*   React Native layout highlighting new text modifications alongside their respective grounding sources.
*   Accept/Reject actions for each suggested resume line.

---

## 3. Deferred Backlog (SaaS Phase)

These capabilities are deferred to Phase 2 (SaaS launch) to maintain a lean MVP timeline.

*   **Multi-tenant Auth Integration:** Auth0/Cognito integration, secure password resets, and sessions.
*   **Continuous Cloud Synchronization:** Real-time workspace synchronization and database mirroring from local SQLite to Postgres.
*   **Collaborative Annotation & Review:** Recruiter-specific comment channels and document access tokens.
*   **AI Mock Interview Simulator:** Audio/video interview simulator grounded in generated resume files (Requires significant audio/video latency infrastructure).

---

## 4. Scope Risk Analysis

| Scope Item | Risk of Scope Creep | Mitigation Strategy |
|---|---|---|
| **DOCX Template Support** | **High:** Complex document layouts (multi-column tables, custom shapes) can break standard XML replacement scripts. | Limit supported templates in MVP to a curated catalog of 5 standard professional layouts. |
| **Local Embeddings (RAG)** | **Medium:** Model size restrictions and hardware variance on developer devices. | Implement fallback logic that defaults to a cloud LLM with zero-retention policies if local embeddings fail. |
| **Interactive Text Editor** | **Medium:** Rich text editing inside React Native can suffer from performance issues. | Keep inputs styled inside standard form controls (block-level inputs) rather than complete inline rich-text blocks. |
