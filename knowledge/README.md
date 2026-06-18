# Open Knowledge Format (OKF) Standards

Every knowledge file in `/knowledge` must adhere to this system format.

## Metadata Schema
Each markdown file must start with a YAML frontmatter that matches the `/knowledge/okf_metadata_schema.json` schema.

### Example Frontmatter
```yaml
---
id: OKF-ENG-001
type: engineering_standard
title: Error Handling Conventions
owner: Tech Lead Agent
last_updated: 2026-06-17
depends_on: []
tags: [standards, coding]
---
```

## RAG & Retrieval Rules
1. **Granularity**: Keep files focused. One concept, one file.
2. **Cross-Links**: Use explicit links: `[link name](file:///path/to/another_file.md)`.
3. **No Redundancy**: Do not duplicate existing rules; modify/update metadata delta.
