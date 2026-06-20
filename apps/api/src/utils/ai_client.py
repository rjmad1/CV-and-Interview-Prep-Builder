from contextvars import ContextVar
from typing import Any

import httpx

from apps.api.src.config import settings

nvidia_api_key_ctx: ContextVar[str] = ContextVar("nvidia_api_key", default="")
ai_gateway_mode_ctx: ContextVar[str] = ContextVar("ai_gateway_mode", default="")

class AIGatewayClient:
    def __init__(self):
        self.base_url = settings.AI_GATEWAY_URL
        self.client = httpx.AsyncClient(timeout=60.0)

    async def close(self):
        await self.client.aclose()

    def _get_headers(self) -> dict[str, str]:
        headers = {}
        api_key = nvidia_api_key_ctx.get()
        mode = ai_gateway_mode_ctx.get()
        if api_key:
            headers["X-NVIDIA-API-Key"] = api_key
        if mode:
            headers["X-AI-Gateway-Mode"] = mode
        return headers

    async def generate(self, model: str, messages: list[dict[str, str]], temperature: float = 0.2, max_tokens: int = 1024) -> str:
        url = f"{self.base_url}/generate"
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        response = await self.client.post(url, json=payload, headers=self._get_headers())
        response.raise_for_status()
        return response.json()["content"]

    async def embed(self, texts: list[str]) -> list[list[float]]:
        url = f"{self.base_url}/embed"
        payload = {"texts": texts}
        response = await self.client.post(url, json=payload, headers=self._get_headers())
        response.raise_for_status()
        return response.json()["embeddings"]

    async def rerank(self, query: str, passages: list[str]) -> list[dict[str, Any]]:
        url = f"{self.base_url}/rerank"
        payload = {"query": query, "passages": passages}
        response = await self.client.post(url, json=payload, headers=self._get_headers())
        response.raise_for_status()
        return response.json()["results"]

    async def classify(self, text: str) -> str:
        url = f"{self.base_url}/classify"
        payload = {"text": text}
        response = await self.client.post(url, json=payload, headers=self._get_headers())
        response.raise_for_status()
        return response.json()["category"]

ai_gateway_client = AIGatewayClient()
