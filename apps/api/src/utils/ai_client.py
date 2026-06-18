import httpx
from typing import List, Dict, Any
from apps.api.src.config import settings

class AIGatewayClient:
    def __init__(self):
        self.base_url = settings.AI_GATEWAY_URL
        self.client = httpx.AsyncClient(timeout=60.0)

    async def close(self):
        await self.client.aclose()

    async def generate(self, model: str, messages: List[Dict[str, str]], temperature: float = 0.2, max_tokens: int = 1024) -> str:
        url = f"{self.base_url}/generate"
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        response = await self.client.post(url, json=payload)
        response.raise_for_status()
        return response.json()["content"]

    async def embed(self, texts: List[str]) -> List[List[float]]:
        url = f"{self.base_url}/embed"
        payload = {"texts": texts}
        response = await self.client.post(url, json=payload)
        response.raise_for_status()
        return response.json()["embeddings"]

    async def rerank(self, query: str, passages: List[str]) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/rerank"
        payload = {"query": query, "passages": passages}
        response = await self.client.post(url, json=payload)
        response.raise_for_status()
        return response.json()["results"]

    async def classify(self, text: str) -> str:
        url = f"{self.base_url}/classify"
        payload = {"text": text}
        response = await self.client.post(url, json=payload)
        response.raise_for_status()
        return response.json()["category"]

ai_gateway_client = AIGatewayClient()
