# ADR-0001: Production JWT Authentication & Tenant Isolation Context

* **Status**: Accepted
* **Date**: 2026-06-18
* **Authors**: Antigravity Principal Architect Agent

## Context
In the local development environment, the FastAPI application uses a hardcoded database lookup in the `get_current_user` dependency that automatically creates and returns a default user `"developer@career-intelligence.studio"`. This dev bypass makes local coding easy, but in a production environment, it leaves the API entirely public and unsecured. 

Additionally, the PostgreSQL Row-Level Security (RLS) policies depend on executing `SET LOCAL app.current_user_id` inside transactions. If a malicious client hits the endpoint without authenticating, the local context won't be set or verified, leading to potential tenant data leaks.

## Decision
We will replace the mock authentication bypass with a secure JWT authentication middleware that:
1. Validates the `Authorization: Bearer <JWT>` header in the HTTP request.
2. Verifies the token signature using public keys fetched from an Identity Provider (IdP) (e.g. AWS Cognito, Auth0, or a secure auth microservice) and caches them locally to optimize performance.
3. Decodes the standard claims including token expiration (`exp`), audience (`aud`), and issuer (`iss`).
4. Extracts the unique user ID (`sub`) and maps it to the tenant context.
5. Invokes `SET LOCAL app.current_user_id` for PostgreSQL Row-Level Security (RLS) enforcement at the start of every database transaction session.

We will configure the `JWT_SECRET` as a mandatory environment variable in production, disabling defaults, and configure FastAPI dependencies to throw an HTTP 401 Unauthorized status on invalid or missing tokens.

## Consequences
* **Trade-offs**: Decoupled JWT verification slightly increases the request latency (due to token signature parsing and validation), which we will mitigate by caching public keys and using lightweight JWT validation libraries (e.g., `PyJWT` or `python-jose`).
* **Limitations**: The local development workflow will now require mock JWT generators or a local token issuer service to test the endpoints. We will provide a local developer script to generate valid mock JWT tokens signed by a dev key.
* **Future Work**: Integrate Role-Based Access Control (RBAC) scopes (e.g., `admin`, `user`) decoded directly from JWT claims to restrict access to management routes.
