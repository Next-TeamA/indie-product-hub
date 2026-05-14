"""Periodic cleanup tasks."""

from app.core.supabase import supabase


async def cleanup_expired_oauth_states():
    """Delete expired OAuth states from DB.
    Run every hour via scheduler.
    """
    supabase.table("oauth_states").delete().lt("expires_at", "now()").execute()
