"""Periodic task: refresh expiring OAuth tokens."""

from datetime import datetime, timezone, timedelta

from app.core.supabase import supabase
from app.core.encryption import encrypt_token, decrypt_token
from app.integrations.x_api import x_client
from app.integrations.threads_api import threads_client


async def refresh_expiring_tokens():
    """Refresh tokens that expire within 24 hours.
    Run every 1 hour via scheduler.
    """
    cutoff = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()

    accounts = (
        supabase.table("connected_accounts")
        .select("*")
        .eq("is_active", True)
        .lte("token_expires_at", cutoff)
        .execute()
    )

    for account in accounts.data or []:
        try:
            provider = account["provider"]

            if provider == "x" and account.get("refresh_token"):
                refresh = decrypt_token(account["refresh_token"])
                new_tokens = await x_client.refresh_token(refresh)
                supabase.table("connected_accounts").update({
                    "access_token": encrypt_token(new_tokens["access_token"]),
                    "refresh_token": encrypt_token(new_tokens.get("refresh_token", refresh)),
                    "token_expires_at": (
                        datetime.now(timezone.utc) + timedelta(seconds=new_tokens.get("expires_in", 7200))
                    ).isoformat(),
                }).eq("id", account["id"]).execute()

            elif provider == "threads":
                token = decrypt_token(account["access_token"])
                new_data = await threads_client.refresh_long_lived_token(token)
                supabase.table("connected_accounts").update({
                    "access_token": encrypt_token(new_data["access_token"]),
                    "token_expires_at": (
                        datetime.now(timezone.utc) + timedelta(seconds=new_data.get("expires_in", 5184000))
                    ).isoformat(),
                }).eq("id", account["id"]).execute()

        except Exception:
            # Alert user about expiring token
            supabase.table("alerts").insert({
                "user_id": account["user_id"],
                "alert_type": "token_expiring",
                "severity": "warning",
                "title": f"{account['provider'].upper()} token refresh failed",
                "message": f"Please reconnect your {account['provider_username'] or account['provider']} account",
            }).execute()
