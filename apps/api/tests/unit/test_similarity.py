"""Unit tests for apps/api/src/utils/similarity.py"""
import pytest
from apps.api.src.utils.similarity import (
    cosine_similarity,
    max_cosine_similarity,
    jaccard_similarity,
    keyword_coverage,
)


class TestCosineSimilarity:
    def test_identical_vectors_returns_one(self):
        v = [1.0, 0.0, 0.0]
        assert cosine_similarity(v, v) == pytest.approx(1.0)

    def test_orthogonal_vectors_returns_zero(self):
        assert cosine_similarity([1.0, 0.0], [0.0, 1.0]) == pytest.approx(0.0)

    def test_zero_vector_returns_zero(self):
        assert cosine_similarity([0.0, 0.0], [1.0, 0.0]) == 0.0

    def test_opposite_direction_returns_negative_one(self):
        assert cosine_similarity([1.0, 0.0], [-1.0, 0.0]) == pytest.approx(-1.0)

    def test_result_in_range(self):
        import random
        for _ in range(20):
            a = [random.gauss(0, 1) for _ in range(128)]
            b = [random.gauss(0, 1) for _ in range(128)]
            sim = cosine_similarity(a, b)
            assert -1.0 <= sim <= 1.0


class TestMaxCosineSimilarity:
    def test_returns_max_across_candidates(self):
        query = [1.0, 0.0]
        candidates = [[0.0, 1.0], [1.0, 0.0], [0.5, 0.5]]
        result = max_cosine_similarity(query, candidates)
        assert result == pytest.approx(1.0)

    def test_empty_candidates_returns_zero(self):
        assert max_cosine_similarity([1.0, 0.0], []) == 0.0


class TestJaccardSimilarity:
    def test_identical_texts(self):
        assert jaccard_similarity("Python FastAPI", "Python FastAPI") == pytest.approx(1.0)

    def test_no_overlap(self):
        assert jaccard_similarity("Python", "JavaScript") == pytest.approx(0.0)

    def test_partial_overlap(self):
        score = jaccard_similarity("Python FastAPI backend", "Python Django backend")
        assert 0.0 < score < 1.0

    def test_empty_strings(self):
        assert jaccard_similarity("", "") == 0.0

    def test_case_insensitive(self):
        assert jaccard_similarity("Python", "python") == pytest.approx(1.0)


class TestKeywordCoverage:
    def test_full_coverage(self):
        assert keyword_coverage("Python FastAPI developer", "Python FastAPI developer backend") == pytest.approx(1.0)

    def test_zero_coverage(self):
        cov = keyword_coverage("machine learning tensorflow", "Java Spring Boot")
        assert cov == 0.0

    def test_empty_text_returns_one(self):
        assert keyword_coverage("", "Python FastAPI") == 1.0

    def test_stop_words_excluded(self):
        # "the", "a", "in" should be excluded; only meaningful words count
        cov = keyword_coverage("the Python developer in FastAPI", "Python FastAPI developer")
        assert cov == pytest.approx(1.0)

    def test_partial_coverage(self):
        cov = keyword_coverage("Python FastAPI Kubernetes", "Python FastAPI")
        # "Kubernetes" not in corpus → coverage < 1.0
        assert cov < 1.0
        assert cov > 0.0
