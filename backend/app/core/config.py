from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_key: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    # App
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"

    # AI
    gemini_api_key: str

    # Token encryption (Fernet key, generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
    encryption_key: str = ""

    # X (Twitter) API
    x_client_id: str = ""
    x_client_secret: str = ""

    # Threads API
    threads_app_id: str = ""
    threads_client_secret: str = ""

    # GitHub
    github_client_id: str = ""
    github_client_secret: str = ""
    github_webhook_secret: str = ""

    # Vercel
    vercel_token: str = ""
    vercel_webhook_secret: str = ""

    # Railway
    railway_token: str = ""

    model_config = {"env_file": ".env"}


settings = Settings()
