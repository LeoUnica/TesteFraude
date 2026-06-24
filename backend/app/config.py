from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://unica_user:unica2024@localhost:5432/unica_promotora"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "unica_promotora_secret_2024_secure_key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    STORMFIN_BASE_URL: str = "https://openapi.stormfin.com.br/v2"
    STORMFIN_V1_URL: str = "https://openapi.stormfin.com.br"
    STORMFIN_USERNAME: str = ""
    STORMFIN_PASSWORD: str = ""
    STORMFIN_CLIENT_ID: str = ""
    STORMFIN_CLIENT_SECRET: str = ""
    STORMFIN_CLIENT_SECRET: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
