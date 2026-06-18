import pytest
from ai_gateway.client import NIMClient

@pytest.mark.asyncio
async def test_gateway_mock_classify():
    client = NIMClient()
    # Test resume classification
    category = await client.classify("Resume for Senior Software Engineer John Doe")
    assert category == "resume"

@pytest.mark.asyncio
async def test_gateway_mock_generate():
    client = NIMClient()
    messages = [{"role": "user", "content": "Analyze job description text."}]
    response = await client.generate("meta/llama-3.1-8b-instruct", messages)
    # Mock analysis returns JSON schema
    assert "company" in response or "extracted_skills" in response
