from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "general-rag-backend"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "change-this-in-production-super-secret-key-32bytes!"

    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./app.db"

    # Storage (S3) - Supports both S3_ENDPOINT_URL and S3_ENDPOINT, etc.
    S3_ENDPOINT_URL: str = Field("https://s3.amazonaws.com", validation_alias="S3_ENDPOINT_URL")
    S3_ENDPOINT: str = ""
    S3_ACCESS_KEY_ID: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET_NAME: str = "general-rag-documents"
    S3_REGION: str = "us-east-1"

    # OCR
    MISTRAL_OCR_API_KEY: str = ""

    # OpenRouter Gateway & Models
    OPENROUTER_API_KEY: str = ""
    EMBEDDING_MODEL_PROVIDER: str = "openrouter"
    EMBEDDING_MODEL_NAME: str = "openai/text-embedding-3-small"
    LLM_MODEL_NAME: str = "anthropic/claude-3.5-sonnet"

    # JWT Authentication
    JWT_SECRET_KEY: str = "change-this-jwt-secret-key-in-production-64bytes!"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @property
    def database_url_final(self) -> str:
        url = self.DATABASE_URL
        if "?" in url:
            url = url.split("?")[0]
        return url

    @property
    def s3_endpoint_final(self) -> str:
        url = self.S3_ENDPOINT or self.S3_ENDPOINT_URL
        if url and not url.startswith("http://") and not url.startswith("https://"):
            url = f"https://{url}"
        return url

    @property
    def s3_access_key_final(self) -> str:
        return self.S3_ACCESS_KEY or self.S3_ACCESS_KEY_ID

    @property
    def s3_secret_key_final(self) -> str:
        return self.S3_SECRET_KEY or self.S3_SECRET_ACCESS_KEY

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json

                return json.loads(v)
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    def validate_required_secrets(self) -> None:
        """Fail fast at startup if required secrets are unconfigured in non-test mode."""
        if self.ENVIRONMENT.lower() == "production":
            missing = []
            if not self.s3_access_key_final:
                missing.append("S3_ACCESS_KEY_ID / S3_ACCESS_KEY")
            if not self.s3_secret_key_final:
                missing.append("S3_SECRET_ACCESS_KEY / S3_SECRET_KEY")
            if not self.OPENROUTER_API_KEY:
                missing.append("OPENROUTER_API_KEY")
            if missing:
                raise ValueError(
                    f"CRITICAL: Missing required production secrets: {', '.join(missing)}"
                )


settings = Settings()
settings.validate_required_secrets()
