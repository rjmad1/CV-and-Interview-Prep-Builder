import os
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Core infrastructure
    DATABASE_URL: str = Field(
        default="postgresql://cis_user:cis_password@localhost:5432/career_intelligence_studio"
    )
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    QDRANT_URL: str = Field(default="http://localhost:6333")

    # AI Gateway
    AI_GATEWAY_URL: str = Field(default="http://localhost:8001")
    AI_GATEWAY_MODE: str = Field(default="mock")
    NVIDIA_API_KEY: str = Field(default="")

    # Document storage — paths configurable via env var, no hardcoded user paths
    STORAGE_TYPE: str = Field(default="local")
    STORAGE_BASE_DIR: str = Field(default="data")
    STORAGE_UPLOAD_DIR: str = Field(default="data/uploads")
    STORAGE_RESUME_DIR: str = Field(default="data/resumes")
    STORAGE_COVER_LETTER_DIR: str = Field(default="data/cover_letters")
    STORAGE_ENCRYPTION_ACTIVE: bool = Field(default=False)

    # Resume template — path configurable, relative to project root by default
    RESUME_TEMPLATE_PATH: str = Field(default="specs/templates/default_resume.docx")

    # Celery
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/0")

    # Environment
    ENV: str = Field(default="development")

    # JWT — no default in production; require explicit env var
    JWT_SECRET: str = Field(default="")
    JWT_ALGORITHM: str = "HS256"

    # Vault encryption — no hardcoded default key
    VAULT_ENCRYPTION_KEY: str = Field(default="")

    # Model mappings
    MODEL_JD_ANALYSIS: str = "meta/llama-3.1-8b-instruct"
    MODEL_RESUME_OPTIMIZATION: str = "meta/llama-3.3-70b-instruct"
    MODEL_INTERVIEW_COACH: str = "nvidia/llama-3.1-nemotron-70b-instruct"
    MODEL_EMBEDDINGS: str = "nvidia/embeddings-nv-embed-qa-4"
    MODEL_RERANKING: str = "nvidia/reranking-nv-embed-rerank-large-4"

    model_config = {
        "env_file": ".env",
        "extra": "ignore",
    }

    def model_post_init(self, __context):
        if self.ENV == "production":
            if not self.JWT_SECRET:
                raise ValueError("JWT_SECRET must be set in production via environment variable.")
            if not self.VAULT_ENCRYPTION_KEY:
                raise ValueError("VAULT_ENCRYPTION_KEY must be set in production via environment variable.")
            if not self.NVIDIA_API_KEY:
                raise ValueError("NVIDIA_API_KEY must be set in production via environment variable.")
        # Development fallbacks — only in non-production
        if not self.JWT_SECRET:
            object.__setattr__(self, "JWT_SECRET", "dev-only-insecure-jwt-secret-change-in-prod")
        if not self.VAULT_ENCRYPTION_KEY:
            # Valid 32-byte Fernet key for dev only; never use in production
            object.__setattr__(self, "VAULT_ENCRYPTION_KEY", "ZmRldmVsb3BtZW50a2V5Zm9yY2lzYXBwMDAwMDAwMDA=")


settings = Settings()
