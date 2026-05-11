from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    supabase_service_role_key: str
    frontend_url: str = "http://localhost:3000"
    gemini_api_key: str

    model_config = {"env_file": ".env"}


settings = Settings()
