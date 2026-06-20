"""
Shared text similarity utilities.

Centralises cosine similarity and Jaccard overlap calculations that were
previously duplicated across main.py, graph/resume_optimization.py, and
the cover-letter generation endpoint.
"""
import re
from collections.abc import Sequence

import numpy as np

# Stop words for keyword-based checks
_STOP_WORDS = frozenset({
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "with", "by", "of", "from", "up", "about", "into", "over", "after",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "i", "you", "he", "she", "it", "we", "they",
    "my", "your", "his", "her", "its", "our", "their",
})


def cosine_similarity(vec_a: Sequence[float], vec_b: Sequence[float]) -> float:
    """Returns the cosine similarity between two vectors in [0, 1]."""
    a, b = np.array(vec_a, dtype=np.float64), np.array(vec_b, dtype=np.float64)
    norm_a, norm_b = np.linalg.norm(a), np.linalg.norm(b)
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def max_cosine_similarity(
    query_vec: Sequence[float], candidate_vecs: Sequence[Sequence[float]]
) -> float:
    """Returns the maximum cosine similarity of query_vec against a list of candidates."""
    if not candidate_vecs:
        return 0.0
    return max(cosine_similarity(query_vec, c) for c in candidate_vecs)


def jaccard_similarity(text_a: str, text_b: str) -> float:
    """Returns symmetric Jaccard token overlap between two strings."""
    tokens_a = set(text_a.lower().split())
    tokens_b = set(text_b.lower().split())
    union = tokens_a | tokens_b
    if not union:
        return 0.0
    return len(tokens_a & tokens_b) / len(union)


def keyword_coverage(text: str, corpus: str) -> float:
    """
    Returns the fraction of meaningful keywords in *text* that appear in *corpus*.

    Uses coverage (not symmetric Jaccard) so a short, precise bullet is not
    penalised against a large evidence corpus with many additional unique terms.
    """
    def keywords(t: str) -> frozenset:
        return frozenset(
            w for w in re.findall(r"\b\w+\b", t.lower())
            if w not in _STOP_WORDS and len(w) > 2
        )

    text_kw = keywords(text)
    if not text_kw:
        return 1.0  # Empty text passes by convention
    corpus_kw = keywords(corpus)
    return len(text_kw & corpus_kw) / len(text_kw)
