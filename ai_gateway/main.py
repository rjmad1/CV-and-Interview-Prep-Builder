import logging
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from ai_gateway.client import NIMClient
from ai_gateway.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cis-ai-gateway")

app = FastAPI(
    title="Career Intelligence Studio - AI Gateway",
    description="Secure internal proxy routing AI requests exclusively to NVIDIA NIM endpoints.",
    version="1.0.0"
)

nim_client = NIMClient()

@app.on_event("shutdown")
async def shutdown_event():
    await nim_client.close()

# Request/Response Schemas
class GenerateRequest(BaseModel):
    model: str = Field(..., description="Target model mapping name")
    messages: List[Dict[str, str]] = Field(..., description="List of prompt messages")
    temperature: float = Field(0.2, description="Sampling temperature")
    max_tokens: int = Field(1024, description="Maximum tokens to generate")

class GenerateResponse(BaseModel):
    content: str

class EmbedRequest(BaseModel):
    texts: List[str] = Field(..., description="List of strings to embed")

class EmbedResponse(BaseModel):
    embeddings: List[List[float]]

class RerankRequest(BaseModel):
    query: str = Field(..., description="Search query")
    passages: List[str] = Field(..., description="List of passages to rerank")

class RerankResponse(BaseModel):
    results: List[Dict[str, Any]]

class ClassifyRequest(BaseModel):
    text: str = Field(..., description="Document content to classify")

class ClassifyResponse(BaseModel):
    category: str

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "AI Gateway",
        "mode": settings.AI_GATEWAY_MODE,
        "api_key_configured": bool(settings.NVIDIA_API_KEY)
    }

@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    try:
        content = await nim_client.generate(
            model=request.model,
            messages=request.messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        return GenerateResponse(content=content)
    except Exception as e:
        logger.error(f"Gateway generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"NIM generation failed: {str(e)}"
        )

@app.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest):
    try:
        embeddings = await nim_client.embed(texts=request.texts)
        return EmbedResponse(embeddings=embeddings)
    except Exception as e:
        logger.error(f"Gateway embedding failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"NIM embedding failed: {str(e)}"
        )

@app.post("/rerank", response_model=RerankResponse)
async def rerank(request: RerankRequest):
    try:
        results = await nim_client.rerank(query=request.query, passages=request.passages)
        return RerankResponse(results=results)
    except Exception as e:
        logger.error(f"Gateway reranking failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"NIM reranking failed: {str(e)}"
        )

@app.post("/classify", response_model=ClassifyResponse)
async def classify(request: ClassifyRequest):
    try:
        category = await nim_client.classify(text=request.text)
        return ClassifyResponse(category=category)
    except Exception as e:
        logger.error(f"Gateway classification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"NIM classification failed: {str(e)}"
        )
