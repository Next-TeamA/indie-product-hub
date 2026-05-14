from supabase import create_client, Client
from app.core.config import settings

supabase: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)


def safe_maybe_single(query) -> dict | None:
    """Execute a maybe_single() query safely.
    Supabase SDK can return None from execute() when no rows match.
    This wrapper guarantees a consistent return: dict or None.
    """
    try:
        result = query.maybe_single().execute()
        if result is None:
            return None
        return result.data
    except Exception:
        return None
