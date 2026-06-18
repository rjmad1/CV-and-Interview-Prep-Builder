import pytest
from apps.api.src.utils.parsers import parse_document

def test_parse_plain_text():
    content = b"Simple resume text."
    result = parse_document(content, "resume.txt")
    assert "Simple resume text." in result

def test_parse_unsupported_format():
    content = b"Some random bytes"
    result = parse_document(content, "resume.xyz")
    assert "Some random bytes" in result
