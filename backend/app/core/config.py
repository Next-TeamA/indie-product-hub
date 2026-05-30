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
    backend_port: int = 8000

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

    # Vercel (OAuth Integration -- https://vercel.com/docs/integrations)
    vercel_client_id: str = ""
    vercel_client_secret: str = ""
    vercel_webhook_secret: str = ""

    # Railway (OAuth App -- Workspace Settings > Developer)
    railway_client_id: str = ""
    railway_client_secret: str = ""

    # ==========================================
    # AMP (Autonomous Marketing Platform) - 2026-05-16
    # ==========================================

    # Postgres direct connection (LangGraph checkpointer + pgvector)
    supabase_db_url: str = ""

    # LLM providers (multi-tier router)
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    cohere_api_key: str = ""

    # Media generation
    fal_api_key: str = ""
    fal_webhook_secret: str = ""
    elevenlabs_api_key: str = ""
    elevenlabs_default_voice_id: str = "21m00Tcm4TlvDq8ikWAM"
    elevenlabs_default_voice_id_ko: str = ""

    # Storage / Queue
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = "launchpad-media"
    r2_public_url: str = ""
    redis_url: str = ""

    # SNS Platforms - 신규
    instagram_app_id: str = ""
    instagram_app_secret: str = ""
    instagram_webhook_secret: str = ""

    youtube_client_id: str = ""
    youtube_client_secret: str = ""

    tiktok_client_key: str = ""
    tiktok_client_secret: str = ""

    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""

    # Observability
    sentry_dsn: str = ""
    posthog_api_key: str = ""
    posthog_host: str = "https://us.i.posthog.com"
    langsmith_api_key: str = ""
    langsmith_project: str = "launchpad-amp"
    langchain_tracing_v2: bool = False

    # Notifications
    slack_bot_token: str = ""
    slack_signing_secret: str = ""
    resend_api_key: str = ""
    onesignal_app_id: str = ""
    onesignal_api_key: str = ""

    # Feature Flags
    default_agent_backend: str = "legacy"
    default_autonomy_level: str = "assisted"
    default_daily_post_budget: int = 10
    default_monthly_cost_budget: int = 50

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
