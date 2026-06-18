import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    AI_GATEWAY_MODE: str = os.getenv("AI_GATEWAY_MODE", "mock")  # 'mock' or 'direct'
    NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "")
    NVIDIA_BASE_URL: str = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    
    # Model Mappings
    MODEL_JD_ANALYSIS: str = "meta/llama-3.1-8b-instruct"
    MODEL_RESUME_OPTIMIZATION: str = "meta/llama-3.3-70b-instruct"
    MODEL_INTERVIEW_COACH: str = "nvidia/llama-3.1-nemotron-70b-instruct"
    MODEL_EMBEDDINGS: str = "nvidia/embeddings-nv-embed-qa-4"
    MODEL_RERANKING: str = "nvidia/reranking-nv-embed-rerank-large-4"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
