# ADR-0003: Secure Tenant Isolation in Vector Database

* **Status**: Proposed
* **Date**: 2026-06-18
* **Authors**: Antigravity Principal Architect Agent

## Context
In the current design, document chunk vectors are ingested and queried within a single Qdrant collection named `career_chunks`. Isolation between users is enforced using metadata filters (a "soft isolation" model):
```python
query_filter=qdrant_models.Filter(
    must=[
        qdrant_models.FieldCondition(
            key="user_id",
            match=qdrant_models.MatchValue(value=str(uid))
        )
    ]
)
```
While metadata filtering isolates query results, a developer mistake (e.g. omitting the filter in a new query endpoint) or a vulnerability in the vector database query engine could result in cross-tenant data leaks. In a production SaaS application containing highly sensitive personal data (e.g., CVs, career histories, and performance reviews), soft isolation is a major security risk.

## Decision
We will upgrade Qdrant tenant isolation to a hard partitioning model:
1. **Qdrant Named Partitions (Recommended)**: Use Qdrant's native partitioning feature. We will define a `tenant_id` (using the `user_id` uuid) as the partition key. Under the hood, Qdrant partitions the indexes, ensuring that search algorithms are mathematically bounded to the tenant's index slices.
2. **Namespace Validation Middleware**: Wrap all Qdrant query invocations inside a strict validator utility that guarantees a valid `tenant_id` filter is present in every call. If the filter is missing, the validator will block the query execution.
3. **Payload Encryption**: Encrypt sensitive plain text payloads (like chunk text) stored inside Qdrant using tenant-specific keys (envelope encryption) so that even in the event of database access leakage, raw text remains protected.

## Consequences
* **Trade-offs**: Implementing dedicated partitions slightly increases the indexing configuration complexity and requires migrating existing records. However, it provides robust defense-in-depth security.
* **Limitations**: High numbers of partitions can increase metadata overhead in Qdrant cluster setups, but Qdrant is optimized to handle millions of active tenant partitions.
* **Future Work**: Implement automated cleanup scripts to delete Qdrant partition data when a user deletes their account, complying with GDPR and privacy regulations.
