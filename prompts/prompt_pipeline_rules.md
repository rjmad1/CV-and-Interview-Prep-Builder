# Prompt Pipeline & Engineering Standards

All agent prompts and interface prompts must follow the structured pipeline specified herein.

## 1. The 9-Stage Prompt Execution Pipeline

```
1. Intent Classification ──► 2. Context Retrieval ──► 3. Task Decomposition
                                                            │
6. Execution ◄──────────── 5. Tool Selection ◄──────── 4. Planning
     │
     ▼
7. Validation ───────────► 8. Self-Critique ──────────► 9. Finalization
```

1. **Intent Classification**: Explicitly identify the goal type (e.g., Bug Fix, Feature Implementation).
2. **Context Retrieval**: Retrieve matching schemas, specs, and OKF guidelines.
3. **Task Decomposition**: Segment the changes into isolated component-level adjustments.
4. **Planning**: Propose the solution path and draft `plan.md`.
5. **Tool Selection**: Identify the minimal, non-overlapping tools needed.
6. **Execution**: Apply targeted edits.
7. **Validation**: Execute verification scripts (tests, linter).
8. **Self-Critique**: Audit results against the repository's security and architectural policies.
9. **Finalization**: Commit code and document output.

## 2. Structural & Layout Constraints
* **Role Prompting**: Define the system persona clearly (e.g., "Act as a Principal Software Engineer...").
* **Delimited Context**: Separate code snippets, input values, and specifications using Markdown delimiters (e.g., `<USER_REQUEST>`, `[diff_block_start]`).
* **Structured Outputs**: Require agents to produce schema-conformant JSON payloads or standardized Markdown patches.

## 3. Forbidden Practices
* **No Unverified Assumptions**: Every design decision must align with the approved specification.
* **No Hallucinated References**: Never reference files, APIs, or modules that do not exist or are not imported.
* **No Spec Violations**: Do not skip or drop required fields or constraints listed in the specification files.
