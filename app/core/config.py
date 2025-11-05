from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # OpenAI API Key
    OPENAI_API_KEY: str = ""

    # Document types
    ALLOWED_DOCUMENT_TYPES: list[str] = [".pdf", ".xlsx"]

settings = Settings()
