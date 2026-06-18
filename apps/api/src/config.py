import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://cis_user:cis_password@localhost:5432/career_intelligence_studio"
    )
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    AI_GATEWAY_URL: str = os.getenv("AI_GATEWAY_URL", "http://localhost:8001")
    
    # Celery Broker settings
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

    # JWT Settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-key-cis-saas-production")
    JWT_ALGORITHM: str = "HS256"

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
