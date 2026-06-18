# Engineering Wisdom Operating System

## Purpose

This document condenses the source repository into a tighter operating manual for architecture, engineering, AI-assisted development, and technical governance. It removes repeated guidance, preserves the core decisions, and adds newer, internet-backed practices for higher-efficiency, higher-efficacy AI coding workflows. The goal is not merely lower token usage. The goal is better outcomes, lower drift, faster verification, cleaner decisions, and less operational sprawl.

## Core Thesis

Most engineering failure is self-inflicted. It usually comes from avoidable complexity, weak boundaries, premature custom building, poor security placement, and undisciplined AI usage. The fix is not more prompting theater. The fix is stronger defaults, explicit decision gates, durable execution, scoped context, better verification, and workflows that help the model stay accurate while doing useful work.

## Operating Principles

1. **Adopt before building**. Use the sequence: Adopt → Extend → Wrap → Fork → Build.
2. **Keep business domains clean**. Align services and modules to bounded business capabilities, not UI screens or convenience shortcuts.
3. **Design for enforcement, not intention**. Put isolation, validation, and policy checks in layers that cannot be bypassed casually.
4. **Separate stateful execution from stateless request handling**. Long-running or recoverable work belongs in durable workflows, not ad hoc queues or web nodes.
5. **Separate transactional, analytical, and secret-bearing concerns**. One store should not carry every burden.
6. **Constrain AI the same way you constrain engineers**. Good output requires narrow context, explicit rules, clear tools, and gated execution.
7. **Optimize for decision quality, not raw compactness**. Smaller context is useful only when it keeps the highest-signal information and improves correctness, speed, and reviewability.
8. **Verification beats eloquence**. Agents perform better when success criteria, repro steps, tests, linting, and completion checks are specified up front.
9. **Progress must survive context resets**. Long tasks need structured notes, compaction, and explicit handoff artifacts instead of relying on thread memory alone.
10. **One session, one goal**. Mixing unrelated implementation goals in one thread increases drift, hidden conflicts, and review cost.

## System Architecture

### Domain and service design

- Organize systems around bounded contexts.
- Do not couple services by direct database sharing.
- Prefer API or event contracts over hidden internal reach-through.
- Keep adapters, domain logic, persistence, and ingress concerns separate.
- Avoid building architecture around pages, dashboards, or frontend component trees.

### Security boundaries

- Enforce tenant isolation at the database layer using row-level security.
- Validate identity at the ingress gateway, then pass sanitized identity metadata downstream.
- Do not trust downstream services to parse raw tokens safely or consistently.
- Treat application-layer tenant filters as convenience logic, not the primary security boundary.
- Keep sensitive credentials out of operational databases. Store only secret references or pointers.

### Data placement

- Use relational databases for transactional integrity and metadata.
- Use columnar or analytical stores for telemetry, logs, metrics, and reporting.
- Use secret managers for credentials and cryptographic material.
- Match the database engine to the workload. Do not force one system to serve OLTP, analytics, secrets, and event replay at once.

### Execution model

- Any stateful, multi-step, retryable, or long-running process should use a durable workflow engine.
- Ephemeral queues are acceptable only for short-lived, non-critical, high-throughput work.
- CPU-heavy tasks must run in isolated workers, not on API or gateway nodes.
- Service communication should prefer events for domain transitions instead of fragile synchronous chains.
- Writes that trigger external effects should use an outbox pattern to keep state and event emission aligned.

### Platform evolution

- Build white-labeling and regional routing support early if they are foreseeable.
- Centralize configuration and keep infrastructure declarative.
- Standardize ports, routing, and deployment conventions to reduce friction and drift.
- Design for graceful degradation when dependencies fail.

## Engineering Rules

### Build vs buy

Use custom engineering only for strategic differentiation. Commodity capabilities such as auth, secrets, workflows, gateways, storage, and observability should be adopted unless a strong business reason says otherwise.

Before adding any tool, SDK, API, or framework, require a short evaluation covering:

| Check | Required question |
|---|---|
| Capability | What problem does it solve? |
| Necessity | Why is it needed now? |
| Alternatives | Can the current stack already handle this? |
| Action | Adopt, extend, wrap, fork, or build? |
| Cost | What is the maintenance and hosting burden? |
| Security | What attack surface or compliance risk is added? |
| License | Is the license acceptable for commercial use? |
| Exit plan | How will it be replaced if needed? |

### Development constraints

- No implementation without a committed spec and plan.
- No direct database access from third-party integration adapters.
- No duplicate tools for the same core capability.
- No schema transitions without a rollback-safe migration path, including dual writes where needed.
- No optimization work without telemetry showing a real bottleneck.
- No production promotion without instrumentation, tests, and policy checks.

### Reliability defaults

- Make handlers idempotent by default.
- Version workflow definitions when changing execution semantics.
- Apply rate limiting at ingress.
- Reuse connection pools and centralized config systems.
- Keep local and CI test environments capable of running without live third-party networks.

## AI-Assisted Development

### Mandatory workflow

1. Start with `spec.md` and `plan.md`.
2. Break work into a checklist at component or file level.
3. Keep prompts narrow and task-scoped.
4. Feed only the target files, direct dependencies, canonical examples, and tests.
5. State validation commands, repro steps, and definition of done before code generation.
6. Validate immediately with tests, linting, diffs, and targeted manual review.
7. Review output against architectural rules before merge.

### Context engineering upgrades

These are the biggest gaps in the original document. They matter because efficient vibe coding is mostly a context design problem, not a typing problem.

#### 1. Layer context by level

Use three explicit layers instead of one blob:

- **Project layer**: architecture rules, coding conventions, tool restrictions, domain glossary.
- **Session layer**: current goal, constraints, touched files, active checklist, definition of done.
- **Task layer**: exact bug, feature, repro case, example file, test command, acceptance criteria.

This reduces sprawl by keeping stable rules persistent while letting volatile task detail rotate cleanly.

#### 2. Prefer canonical examples over rule spam

A few representative examples are more useful than a giant wall of edge cases. Canonical examples teach structure, naming, error style, and implementation shape faster than abstract prose.

#### 3. Use just-in-time retrieval, not eager dumping

Do not preload the entire repo, long specs, or giant logs. Keep lightweight references such as file paths, plans, and notes, then retrieve details only when needed.

#### 4. Compact aggressively, but preserve decision memory

When resetting context, preserve:

- Architectural decisions.
- Open questions.
- Rejected approaches and why.
- Files changed.
- Validation status.
- Remaining tasks.

Drop raw tool noise, repeated logs, and stale discussion. Compaction should preserve trajectory, not just shorten text.

#### 5. Externalize working memory

Maintain lightweight artifacts such as `progress.md`, `notes.md`, `plan.md`, or task-local scratchpads. Long-horizon work is more reliable when the agent can rehydrate from explicit notes instead of vague memory.

#### 6. Separate planner from executor modes

For non-trivial work, use at least two phases:

- **Planner mode**: scope the work, identify files, list risks, propose steps.
- **Executor mode**: make bounded edits and run checks.

This removes a common failure pattern where the model invents implementation before understanding system constraints.

#### 7. Keep tools distinct and low-overlap

If two tools do almost the same thing, the agent will waste effort deciding between them or use the wrong one. Tool menus should be minimal, explicit, and easy to disambiguate.

#### 8. Write goals with measurable completion criteria

Goals should define outcomes the agent can verify, not vague aspirations. Good goals include build status, tests passed, latency targets, schema constraints, or output format expectations.

#### 9. Use one thread per file cluster or feature slice

Parallel work is fine, but do not let two active threads modify the same files. Split work by subsystem, not by arbitrary prompt boundaries.

#### 10. Course-correct early

Do not wait until the end of a long agent run to inspect output. Intervene after plan creation, after first edits, and after verification. Early correction is cheaper than heroic cleanup later.

### Prompt discipline

- Do not overload a model with roadmaps, unrelated logs, or broad project dumps.
- Do not ask for massive file rewrites when targeted edits are enough.
- Do not allow dependency installation without explicit human review.
- Prefer mock providers and interface contracts over live integrations during implementation.
- Use concise, technical instructions instead of conversational prompt sprawl.
- Put instructions first, then context, then examples, then output requirements.
- Reset sessions when task boundaries shift to prevent context bleed.
- Explicitly state what not to touch, especially in mature codebases.

### Verification-first prompting

Every substantive implementation prompt should include:

| Field | Why it matters |
|---|---|
| Objective | Stops fuzzy task expansion. |
| Scope boundaries | Prevents collateral edits. |
| Relevant files | Anchors retrieval and search. |
| Example file or pattern | Reduces style drift. |
| Repro steps | Helps the agent verify the issue. |
| Validation commands | Gives the model a way to check itself. |
| Acceptance criteria | Defines done clearly. |
| Constraints and anti-patterns | Prevents repeated mistakes. |

### Advanced workflow hacks

These improve efficacy, not just compactness:

- **Issue-style prompts**. Structure tasks like a GitHub issue with problem, context, constraints, expected behavior, and validation. This tends to produce more grounded execution.
- **Open file anchoring**. Reference exact files and code regions when possible instead of saying “look around.” That cuts search drift.
- **Failure-case library**. Keep a small set of recurring failure prompts and postmortems. Improve the system prompt or checklist against real misses, not imagined ones.
- **Best-of-N for risky design choices**. When architecture or API design is ambiguous, ask for two or three options with trade-offs before implementation. This is slower upfront but cheaper than undoing a bad path.
- **Side-chat for explanation, main thread for action**. Keep implementation threads focused. Ask for recaps, teaching, or status in a separate thread when possible.
- **Use images, schemas, traces, and sample payloads** when they clarify edge cases better than prose. Rich artifacts can improve precision when text descriptions are underspecified.
- **Maintain a living devdocs folder** for architecture notes, conventions, and progress checkpoints so fresh sessions can restart cleanly.

### Why this matters

AI does not fail only because models are weak. It fails because humans hand it bloated context, vague goals, overlapping tools, no examples, weak verification, and no durable memory. That is a workflow failure. Fix the workflow and vibe coding becomes less chaotic, more compounding, and far more trustworthy.

## Testing and Delivery

### Testing priorities

- Verify row-level security with database-level isolation tests.
- Test OAuth and auth edge cases end to end.
- Use deterministic workflow tests with mocked time for long-running schedules.
- Include offline mock paths for external integrations.
- Enforce coverage and schema assertions in CI.
- Print short, actionable failures instead of noisy logs so the agent can recover faster.

### Delivery controls

- Keep gateway and infrastructure config declarative and versioned.
- Run policy-as-code checks on deployment manifests.
- Automate secret rotation and credential lifecycle management.
- Separate worker scaling from web/API scaling.
- Use GitOps or equivalent reconciliation to prevent config drift.

## Permanent Guardrails

These are non-negotiable:

- No raw credentials in relational databases.
- No tenant isolation that depends only on application code.
- No long-running scheduling on cron jobs or in-memory queues.
- No analytics workloads on transactional databases.
- No direct database access inside integration adapters.
- No undocumented dependency adoption.
- No feature work without git-anchored specs and plans.
- No production dependency on third-party APIs without sandbox validation.
- No CPU-bound media or heavy compute on request-serving nodes.
- No insecure infrastructure changes without automated policy review.
- No multi-feature prompt bundles in a single implementation session when the files, goals, or success criteria differ.

## Failure Patterns to Avoid

| Failure pattern | Root issue | Better default |
|---|---|---|
| Tokens stored in app DB | Security shortcuts | Secret manager pointers |
| In-memory scheduling for durable jobs | Misjudged statefulness | Workflow engine |
| Prompting with huge context dumps | Laziness in task scoping | Layered context plus just-in-time retrieval |
| App-layer tenant filtering only | Weak enforcement | Database RLS |
| Ad hoc dependency adoption | No governance | Qualification block |
| Analytics on OLTP store | Wrong workload placement | Event stream to analytical store |
| CPU-heavy jobs on API nodes | Resource coupling | Dedicated workers |
| Wiki-only specs | Drift from code reality | Git-anchored artifacts |
| Hard-coded branding and domains | Late extensibility thinking | Runtime theming and metadata-driven routing |
| Manual deployments and rotations | Human fragility | Automated pipelines and rotation workflows |
| One giant coding thread for many goals | Context drift and hidden conflicts | One thread per feature slice |
| Long prompts with no verification path | Polished but unreliable output | Repro plus test plus acceptance criteria |
| Too many overlapping tools | Tool confusion | Minimal distinct toolset |
| Repeating rules without examples | Weak behavioral transfer | Canonical examples |

## Decision Framework

Use this sequence whenever a new capability, refactor, or platform choice appears:

1. Determine whether the capability is strategically differentiating.
2. If not, adopt an existing stable tool or service.
3. If yes, check whether an existing tool solves most of the problem.
4. If it does, wrap or extend it behind clean interfaces.
5. If it does not, build only the domain-specific core.
6. Before committing, define cost, security impact, exit strategy, and verification method.
7. Enforce the result through code structure, policy gates, review checklists, and durable project notes.

## Readiness Checklist

A project is not production-serious until the following are in place:

- Identity provider and scope model.
- Secrets engine and access policy model.
- Relational database with row-level security.
- Durable workflow runtime.
- Event broker and analytical ingestion path.
- Offline mocks for external services.
- Observability scaffolding.
- Declarative gateway configuration.
- CI policy checks.
- Git-anchored design artifacts.
- Canonical implementation examples for common patterns.
- Session-reset-safe notes and progress artifacts for long-horizon AI work.
- Prompt templates that include scope, repro, validation, and acceptance criteria.

## Continuous Improvement

Every major incident or failed AI task should produce a governance upgrade:

1. Run a retrospective and isolate the real control failure.
2. Convert the lesson into a rule, checklist item, lint, note template, or tool constraint.
3. Sync that rule into AI instructions, CI gates, devdocs, and onboarding material.
4. Maintain a small eval set of passing and failing cases so prompt and workflow improvements are tested against reality, not vibes.

Repository Intelligence Generation Rules

Repository Intelligence artifacts are generated exactly once.

Subsequent executions must:

- Load existing artifacts
- Apply diffs
- Update deltas

Never regenerate:

- Business Capability Maps
- Domain Models
- Ubiquitous Language Dictionaries
- Architecture Summaries
- Repository Intelligence Reports

unless:

- Repository bootstrap
- Brownfield discovery
- Major architecture migration
- Explicit user request

## Practical Use

Use this file as:

- A system prompt or knowledge block for engineering-focused AI agents.
- A review baseline for architecture and dependency decisions.
- An onboarding artifact for senior engineers and tech leads.
- A pre-implementation checklist before new platform work begins.
- A template for designing cleaner, more reliable vibe coding workflows.

## Final Position

The missing idea in the original repository was not “use fewer tokens.” That framing is too shallow. The real objective is higher signal density, better retrieval timing, stronger verification, durable memory, clearer goals, and less tool and thread confusion. Efficient vibe coding is really disciplined context engineering plus disciplined software engineering. Anything else is just elegant chaos.
