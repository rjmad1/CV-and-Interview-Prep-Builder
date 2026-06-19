"""Unit tests for the EmbeddingPipeline text chunking functions."""
import pytest
from apps.api.src.engine.embedding_pipeline import re_split_paragraphs, re_split_sentences


class TestReSplitParagraphs:
    def test_splits_on_double_newline(self):
        text = "First paragraph.\n\nSecond paragraph."
        parts = [p for p in re_split_paragraphs(text) if p.strip()]
        assert len(parts) == 2
        assert "First paragraph." in parts[0]
        assert "Second paragraph." in parts[1]

    def test_splits_on_single_newline(self):
        text = "Line one.\nLine two."
        parts = [p for p in re_split_paragraphs(text) if p.strip()]
        assert len(parts) == 2

    def test_empty_string_returns_empty(self):
        result = re_split_paragraphs("")
        assert result == [""]

    def test_no_newlines(self):
        text = "Single block of text."
        parts = [p for p in re_split_paragraphs(text) if p.strip()]
        assert len(parts) == 1


class TestReSplitSentences:
    def test_splits_on_period_and_space(self):
        text = "First sentence. Second sentence."
        parts = [p for p in re_split_sentences(text) if p.strip()]
        assert len(parts) == 2

    def test_splits_on_question_mark(self):
        text = "First question? Second statement."
        parts = [p for p in re_split_sentences(text) if p.strip()]
        assert len(parts) == 2

    def test_splits_on_exclamation(self):
        text = "First! Second sentence."
        parts = [p for p in re_split_sentences(text) if p.strip()]
        assert len(parts) == 2

    def test_single_sentence_no_split(self):
        text = "No sentence boundary here"
        parts = re_split_sentences(text)
        assert len(parts) == 1


class TestChunkText:
    @pytest.fixture
    def pipeline(self, monkeypatch):
        """Returns an EmbeddingPipeline without connecting to Qdrant."""
        monkeypatch.setattr(
            "apps.api.src.engine.embedding_pipeline.QdrantClient",
            lambda **kwargs: (_ for _ in ()).throw(Exception("Mocked — not connecting")),
        )
        from apps.api.src.engine.embedding_pipeline import EmbeddingPipeline
        p = EmbeddingPipeline.__new__(EmbeddingPipeline)
        p.qdrant_client = None
        return p

    def test_empty_text_returns_empty(self, pipeline):
        assert pipeline.chunk_text("") == []

    def test_short_text_is_single_chunk(self, pipeline):
        text = "Short text that fits in one chunk."
        chunks = pipeline.chunk_text(text, chunk_size=500)
        assert len(chunks) == 1

    def test_long_text_is_split_into_chunks(self, pipeline):
        # Build multiple paragraphs to ensure the paragraph splitter can break them
        text = "\n\n".join(["Paragraph about Python and FastAPI development."] * 20)
        chunks = pipeline.chunk_text(text, chunk_size=100)
        assert len(chunks) > 1

    def test_chunks_are_non_empty(self, pipeline):
        text = "Paragraph one.\n\nParagraph two.\n\nParagraph three."
        chunks = pipeline.chunk_text(text)
        assert all(c.strip() for c in chunks)
