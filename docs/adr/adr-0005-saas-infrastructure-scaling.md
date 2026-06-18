# ADR-0005: SaaS Infrastructure Scaling & High Availability

* **Status**: Proposed
* **Date**: 2026-06-18
* **Authors**: Antigravity Principal Architect Agent

## Context
The current infrastructure configuration provisioned via Terraform (`infra/terraform/main.tf`) is a single-node deployment (e.g. single `db.t4g.micro` RDS instance, single ElastiCache Redis cluster, and single Qdrant ECS Fargate task). 

As a multi-tenant SaaS application, this architecture lacks high availability (HA), scale-out capabilities, read replicas, database backups, and data durability guarantees. It is highly susceptible to outages and data loss.

## Decision
We will upgrade the Terraform and application-level configuration for production-grade scaling:
1. **Database Resilience**: 
   - Upgrade the RDS instance class to `db.m6g.large` and enable Multi-AZ deployment.
   - Provision a PostgreSQL Read Replica to handle read-intensive queries (like document searches and portfolio loads), offloading traffic from the primary writer node.
   - Enforce database connection encryption (SSL/TLS mode `require`) in both Terraform security groups and the SQLAlchemy client configurations.
2. **ElasticCache Redis Upgrade**:
   - Enable Multi-AZ replication groups with at least 2 replica nodes for Redis to prevent broker downtime for Celery tasks.
3. **Qdrant Scaling**:
   - Transition Qdrant from a single ECS container to a clustered deployment (using AWS EFS or EBS volumes for persistence and auto-backup). Configure appropriate CPU/Memory limits (at least 2 vCPUs and 4GB RAM per node) to prevent OOM errors.
4. **Celery Worker Scale-Out**:
   - Configure Celery worker concurrency dynamically based on task queue length. Run CPU-bound parser tasks in separate task workers from lightweight API tasks.

## Consequences
* **Trade-offs**: Implementing Multi-AZ, read replicas, and clustered deployments significantly increases the monthly cloud hosting costs.
* **Limitations**: Managing state persistence and vector synchronization in Qdrant clusters requires active maintenance and health check configuration.
* **Future Work**: Establish automated backup validation tasks to regularly test restoration procedures for database and vector indexes.
