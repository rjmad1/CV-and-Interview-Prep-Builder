# ADR-0004: Robust Grounding & Hallucination Prevention in AI Workflows

* **Status**: Proposed
* **Date**: 2026-06-18
* **Authors**: Antigravity Principal Architect Agent

## Context
To prevent AI hallucination, the resume optimization and cover letter generation workflows execute semantic validation checks on generated statements against retrieved evidence chunks.
However, in the event of embedding connection failures, or during offline dev operations, the system falls back to a naive lexical check:
```python
for b in bullets:
    matched = any(any(word in ev.lower() for word in b.lower().split() if len(word) > 4) for ev in evidence_texts)
```
This check allows a generated statement to pass validation if **any single word** of length > 4 matches the evidence. This makes the anti-hallucination guardrail trivial to bypass, allowing unsubstantiated career claims to get into user CVs.

Additionally, the mock interview prep workflow evaluates responses using general LLM prompts without hard semantic validation gates, which can let incorrect candidate performance metrics slide.

## Decision
We will upgrade the grounding validator and remove the lexical loophole:
1. **Remove the Single-Word Loophole**: Replace the naive word-in-text check with a strict token overlap score. The fallback lexical validator must compute a minimum overlap threshold (e.g. BM25 score or Jaccard similarity index >= 0.50 over key nouns and verbs).
2. **Local Embedding Fallback**: Integrate a lightweight, offline sentence transformer library (such as `SentenceTransformers` or `spacy` with small vectors) loaded locally in the Python backend. If the primary cloud AI Gateway embedding endpoint is unavailable, semantic similarity checks will execute locally instead of falling back to insecure lexical checks.
3. **Extend Validation to Interview Prep**: Add a validation node to the `interview_prep_graph` LangGraph workflow. The candidate's answers will be verified against their own CV and portfolio documents to flag ungrounded achievements.

## Consequences
* **Trade-offs**: Local model fallbacks will increase the container size of the API service (since it must package model weights) and increase CPU usage during local verification runs.
* **Limitations**: High-precision semantic verification requires tuning the similarity thresholds (e.g. 0.80 for exact resume bullet points, 0.70 for cover letters to allow style variations).
* **Future Work**: Build a dashboard for users to review and resolve flagged validation events, displaying the source evidence alongside the generated text to make the system transparent.
