"""
Application configuration using Pydantic settings.
Loads from environment variables / .env file.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    # Database
    DATABASE_URL: str = "postgresql://dev:devpassword@localhost:5432/jobcrab"

    # Frontend URL for CORS
    FRONTEND_URL: str = "http://localhost:3000"

    # Service API key (for internal auth between Next.js and this service)
    SERVICE_API_KEY: str = "dev-service-key"

    # Firecrawl API (for Wellfound scraping)
    FIRECRAWL_API_KEY: str = ""

    # DeepSeek API (for NL query parsing)
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_MODEL: str = "deepseek-v4-flash"
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
