---
id: OKF-BUS-005
type: business_capability
title: Staffing Plan and SaaS Economics
owner: Lead Architect Agent
last_updated: 2026-06-20
depends_on: ["OKF-BUS-001", "OKF-BUS-002", "OKF-BUS-003", "OKF-BUS-004"]
tags: [staffing, economics, saas, cost-model]
---

# Staffing Plan and SaaS Economics

This document establishes the staffing allocation, operational hosting cost models, and SaaS economics configurations governing the SaaS transition phase for the **Career Intelligence Studio (CIS)**.

---

## 1. Staffing Plan & Resource Allocation

To execute the 12-week MVP scope and manage the transition to multi-tenant cloud operations, the resource allocation is structured as follows:

### Core Engineering Team Headcount

| Role | Responsibilities | Allocation | Estimated Monthly Cost |
|---|---|---|---|
| **1x Lead Architect Agent** | System architecture, RLS database boundaries, security reviews. | 100% | $15,000 |
| **2x Backend Developers** | FastAPI endpoints, Celery workers, Python XML parsing. | 100% | $24,000 |
| **1x Frontend Developer** | Next.js 15 app, Tailwind layouts, editor view binding. | 100% | $11,000 |
| **1x QA & Eval Engineer** | Hybrid search test suites, layout preservation validation. | 50% | $6,000 |

### Timeline and Milestones allocation

- **Phase 1 (Weeks 1-3):** 100% Backend & Architecture focus on local database schemas and ORM.
- **Phase 2 (Weeks 4-7):** Integration of RAG retrieval engines (Backend) and UI layout styling (Frontend).
- **Phase 3 (Weeks 8-11):** Human-in-the-loop validation interface and final release packaging.
- **Phase 4 (Weeks 12+):** Operations engineer joins for AWS provisioning and multi-tenancy configurations.

---

## 2. SaaS Cost Model (AWS + AI endpoints)

Calculated on a baseline projection of **10,000 monthly active users (MAU)**.

### Monthly AWS Infrastructure Hosting Costs

| AWS Resource | Config Specification | Purpose | Monthly Cost (USD) |
|---|---|---|---|
| **RDS PostgreSQL** | `db.t4g.medium` (Multi-AZ) | Transactional data & metadata storage | $120.00 |
| **ElastiCache Redis** | `cache.t4g.micro` (Single Node)| Celery broker & token rate limiter | $35.00 |
| **ECS Fargate** | 2x `0.5 vCPU / 1GB RAM` tasks | Running request API & Web client servers | $68.00 |
| **Qdrant Vector DB** | Hosted Cloud (Start Tier) | Storing vector embeddings for career facts| $45.00 |
| **S3 Storage & Transfer**| 500GB Standard + Data transfer | Ingested PDF/DOCX resume templates | $28.00 |
| **Application ALB** | 1x Active Load Balancer | Secure HTTP traffic ingress | $22.00 |
| **Total AWS Cost** | | | **$318.00** |

### AI Endpoint Execution Costs (LLM API)

*Assumptions:*
- Each user conducts **5 resume optimizations** per month.
- Average prompt footprint: **15,000 input tokens** (grounding context + templates) & **1,500 output tokens** (optimized paragraphs).
- Cost per million tokens (OpenAI gpt-4o-mini baseline): **$0.150 / 1M input**, **$0.600 / 1M output**.

$$\text{Input cost per user} = 5 \times 15,000 \times \left(\frac{\$0.150}{1,000,000}\right) = \$0.01125$$
$$\text{Output cost per user} = 5 \times 1,500 \times \left(\frac{\$0.600}{1,000,000}\right) = \$0.00450$$
$$\text{Total AI cost per user} = \$0.01575 \text{ per user / month}$$

For **10,000 MAU**:

$$\text{Total LLM API Cost} = 10,000 \times \$0.01575 = \mathbf{\$157.50}$$

---

## 3. SaaS Business Economics & Margins

### Revenue Model

- **B2C Subscription Tier:** $19.00 / user / month
- **Conversion Rate:** 2.5% of MAU converts to paying subscribers = **250 active subscriptions**

$$\text{Monthly Recurring Revenue (MRR)} = 250 \times \$19.00 = \mathbf{\$4,750.00}$$

### Margin Calculations

| Item | Monthly Value (USD) | Percentage of Revenue |
|---|---|---|
| Gross Revenue | $4,750.00 | 100% |
| Infrastructure Host Cost | $318.00 | 6.7% |
| LLM API Query Cost | $157.50 | 3.3% |
| Total Cost of Goods Sold (COGS) | **$475.50** | **10.0%** |
| **Gross Margin** | **$4,274.50** | **90.0%** |

### Break-Even Threshold

$$\text{Required paying subscribers} = \frac{\text{Total Infrastructure Base Costs}}{\text{Subscription Price} - \text{Variable LLM cost per user}}$$
$$\text{Required paying subscribers} = \frac{\$318.00}{\$19.00 - \$0.01575} \approx \mathbf{17 \text{ subscribers}}$$
