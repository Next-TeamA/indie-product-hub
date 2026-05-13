"""Connected accounts management -- OAuth flows for X, Threads, GitHub, Vercel, Railway."""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse

from app.api.dependencies.auth import get_current_user
from app.core.config import settings
from app.core.encryption import encrypt_token, decrypt_token
from app.core.exceptions import AppError, NotFoundError
from app.core.supabase import supabase
from app.integrations.x_api import x_client, XAPIClient
from app.integrations.threads_api import threads_client
from app.integrations.github_api import github_client
from app.integrations.vercel_api import vercel_client
from app.integrations.railway_api import railway_client

router = APIRouter(prefix="/accounts", tags=["accounts"])

# In-memory state store for OAuth flows (use Redis in production)
_oauth_states: dict[str, dict] = {}


@router.get("")
async def list_accounts(user: dict = Depends(get_current_user)):
    """List all connected accounts for the current user."""
    result = (
        supabase.table("connected_accounts")
        .select("id, provider, provider_username, provider_user_id, is_active, last_synced_at, created_at")
        .eq("user_id", user["id"])
        .eq("is_active", True)
        .order("created_at")
        .execute()
    )
    return result.data


@router.get("/connect/{provider}")
async def connect_account(provider: str, user: dict = Depends(get_current_user)):
    """Get OAuth URL to connect a new account."""
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = {"user_id": user["id"], "provider": provider}

    if provider == "x":
        verifier, challenge = XAPIClient.generate_pkce()
        _oauth_states[state]["code_verifier"] = verifier
        url = x_client.get_auth_url(state, challenge)
    elif provider == "threads":
        url = threads_client.get_auth_url(state)
    elif provider == "github":
        url = github_client.get_auth_url(state)
    elif provider == "vercel":
        url = vercel_client.get_auth_url(state)
    elif provider == "railway":
        url = railway_client.get_auth_url(state)
    else:
        raise AppError(f"Unsupported provider: {provider}", 400)

    return {"auth_url": url, "state": state}


@router.get("/callback/{provider}")
async def oauth_callback(provider: str, code: str, state: str):
    """Handle OAuth callback from provider."""
    stored = _oauth_states.pop(state, None)
    if not stored or stored["provider"] != provider:
        raise AppError("Invalid OAuth state", 400)

    user_id = stored["user_id"]

    if provider == "x":
        token_data = await x_client.exchange_code(code, stored["code_verifier"])
        user_info = await x_client.get_me(token_data["access_token"])
        account_data = {
            "user_id": user_id,
            "provider": "x",
            "provider_user_id": user_info["id"],
            "provider_username": user_info.get("username"),
            "access_token": encrypt_token(token_data["access_token"]),
            "refresh_token": encrypt_token(token_data.get("refresh_token", "")),
            "token_expires_at": (datetime.now(timezone.utc) + timedelta(seconds=token_data.get("expires_in", 7200))).isoformat(),
            "scopes": token_data.get("scope", "").split(" "),
            "profile_data": {"name": user_info.get("name"), "avatar": user_info.get("profile_image_url")},
            "is_active": True,
        }

    elif provider == "threads":
        short_token_data = await threads_client.exchange_code(code)
        long_token_data = await threads_client.get_long_lived_token(short_token_data["access_token"])
        user_info = await threads_client.get_me(long_token_data["access_token"])
        account_data = {
            "user_id": user_id,
            "provider": "threads",
            "provider_user_id": user_info["id"],
            "provider_username": user_info.get("username"),
            "access_token": encrypt_token(long_token_data["access_token"]),
            "refresh_token": "",
            "token_expires_at": (datetime.now(timezone.utc) + timedelta(days=60)).isoformat(),
            "scopes": ["threads_basic", "threads_content_publish", "threads_manage_insights"],
            "profile_data": {"avatar": user_info.get("threads_profile_picture_url")},
            "is_active": True,
        }

    elif provider == "github":
        token_data = await github_client.exchange_code(code)
        user_info = await github_client.get_user(token_data["access_token"])
        account_data = {
            "user_id": user_id,
            "provider": "github",
            "provider_user_id": str(user_info["id"]),
            "provider_username": user_info.get("login"),
            "access_token": encrypt_token(token_data["access_token"]),
            "refresh_token": "",
            "token_expires_at": None,
            "scopes": token_data.get("scope", "").split(","),
            "profile_data": {"name": user_info.get("name"), "avatar": user_info.get("avatar_url")},
            "is_active": True,
        }

    elif provider == "vercel":
        token_data = await vercel_client.exchange_code(code)
        user_info = await vercel_client.get_user(token_data["access_token"])
        account_data = {
            "user_id": user_id,
            "provider": "vercel",
            "provider_user_id": str(user_info.get("id", "")),
            "provider_username": user_info.get("username", user_info.get("name")),
            "access_token": encrypt_token(token_data["access_token"]),
            "refresh_token": "",
            "token_expires_at": None,
            "scopes": [],
            "profile_data": {"name": user_info.get("name"), "avatar": user_info.get("avatar")},
            "is_active": True,
        }

    elif provider == "railway":
        token_data = await railway_client.exchange_code(code)
        user_info = await railway_client.get_user(token_data["access_token"])
        account_data = {
            "user_id": user_id,
            "provider": "railway",
            "provider_user_id": str(user_info.get("id", "")),
            "provider_username": user_info.get("name"),
            "access_token": encrypt_token(token_data["access_token"]),
            "refresh_token": encrypt_token(token_data.get("refresh_token", "")),
            "token_expires_at": None,
            "scopes": [],
            "profile_data": {"name": user_info.get("name"), "avatar": user_info.get("avatar")},
            "is_active": True,
        }

    else:
        raise AppError(f"Unsupported provider: {provider}", 400)

    # Upsert (update if exists, insert if not)
    supabase.table("connected_accounts").upsert(
        account_data,
        on_conflict="user_id,provider,provider_user_id",
    ).execute()

    return RedirectResponse(url=f"{settings.frontend_url}/settings?connected={provider}")


@router.delete("/{account_id}", status_code=204)
async def disconnect_account(account_id: str, user: dict = Depends(get_current_user)):
    """Disconnect (deactivate) an account."""
    result = (
        supabase.table("connected_accounts")
        .update({"is_active": False})
        .eq("id", account_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not result.data:
        raise NotFoundError("Account", account_id)
