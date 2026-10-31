from functools import lru_cache
from pathlib import Path
from typing import List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "LocalLearn AI Backend"
    environment: str = "development"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS origins for frontend
    cors_origins: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    # Gemma / Gemini LLM service configs
    gemini_api_key: Optional[str] = None
    gemma_model: str = "gemma-4-26b-a4b-it"
    gemma_api_base_url: str = "http://localhost:11434"
    gemma_model_name: str = "llama3.2:latest"
    gemma_timeout_seconds: int = 60
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:latest"

    # Data directory
    data_dir: str = "data"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            import json
            if isinstance(v, str):
                try:
                    return json.loads(v)
                except Exception:
                    return [v]
            return v
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

    @property
    def base_dir(self) -> Path:
        return Path(__file__).resolve().parent.parent

    @property
    def data_path(self) -> Path:
        return self.base_dir / self.data_dir


@lru_cache()
def get_settings() -> Settings:
    return Settings()
