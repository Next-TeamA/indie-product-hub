"""Connected accounts management -- OAuth flows for X, Threads, GitHub, Vercel, Railway.
OAuth state stored in Supabase for multi-process safety.
"""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse

from app.api.dependencies.auth import get_current_user
from app.core.config import settings
from app.core.encryption import encrypt_token
from app.core.exceptions import AppError, NotFoundError
from app.core.supabase import supabase
from app.integrations.x_api import x_client, XAPIClient
from app.integrations.threads_api import threads_client
from app.integrations.github_api import github_client
from app.integrations.vercel_api import vercel_client
from app.integrations.railway_api import railway_client

router = APIRouter(prefix="/accounts", tags=["accounts"])

# OAuth state TTL
STATE_TTL_MINUTES = 10


def _save_state(state: str, data: dict) -> None:
    """Store OAuth state in DB with TTL."""
    supabase.table("oauth_states").insert({
        "state": state,
        "data": data,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=STATE_TTL_MINUTES)).isoformat(),
    }).execute()


def _pop_state(state: str) -> dict | None:
    """Retrieve and delete OAuth state. Returns None if expired or missing."""
    result = (
        supabase.table("oauth_states")
        .select("data, expires_at")
        .eq("state", state)
        .maybe_single()
        .execute()
    )
    if not result.data:
        return None

    # Delete regardless (single use)
    supabase.table("oauth_states").delete().eq("state", state).execute()

    # Check expiry
    expires_at = datetime.fromisoformat(result.data["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        return None

    return result.data["data"]


@router.get("")
async def list_accounts(user: dict = Depends(get_current_user)):
    result = (
        supabase.table("connected_accounts")
        .select("id, provider, provider_username, provider_user_id, is_active, last_synced_at, created_at")
        .eq("user_id", user["id"])
        .eq("is_active", True)
        .order("created_at")
        .execute()
    )
    return result.data


@router.get("/github/repos")
async def list_github_repos(user: dict = Depends(get_current_user)):
    """List GitHub repos accessible by the user's connected GitHub account."""
    account = (
        supabase.table("connected_accounts")
        .select("access_token")
        .eq("user_id", user["id"])
        .eq("provider", "github")
        .eq("is_active", True)
        .maybe_single()
        .execute()
    )
    if not account.data:
        raise AppError("GitHub account not connected", 400)

    from app.core.encryption import decrypt_token
    token = decrypt_token(account.data["access_token"])
    repos = await github_client.list_repos(token)
    return [
        {
            "id": r["id"],
            "full_name": r["full_name"],
            "owner": r["owner"]["login"],
            "name": r["name"],
            "description": r.get("description"),
            "private": r["private"],
            "language": r.get("language"),
            "updated_at": r.get("pushed_at"),
        }
        for r in repos
    ]


@router.get("/vercel/projects")
async def list_vercel_projects(user: dict = Depends(get_current_user)):
    """List Vercel projects accessible by the user's connected Vercel account."""
    account = (
        supabase.table("connected_accounts")
        .select("access_token")
        .eq("user_id", user["id"])
        .eq("provider", "vercel")
        .eq("is_active", True)
        .maybe_single()
        .execute()
    )
    if not account.data:
        raise AppError("Vercel account not connected", 400)

    from app.core.encryption import decrypt_token
    token = decrypt_token(account.data["access_token"])
    projects = await vercel_client.list_projects(token)
    return [
        {
            "id": p["id"],
            "name": p["name"],
            "framework": p.get("framework"),
            "updated_at": p.get("updatedAt"),
        }
        for p in projects
    ]


@router.get("/railway/projects")
async def list_railway_projects(user: dict = Depends(get_current_user)):
    """List Railway projects accessible by the user's connected Railway account."""
    account = (
        supabase.table("connected_accounts")
        .select("access_token")
        .eq("user_id", user["id"])
        .eq("provider", "railway")
        .eq("is_active", True)
        .maybe_single()
        .execute()
    )
    if not account.data:
        raise AppError("Railway account not connected", 400)

    from app.core.encryption import decrypt_token
    token = decrypt_token(account.data["access_token"])
    projects = await railway_client.list_projects(token)
    return [
        {
            "id": p["id"],
            "name": p["name"],
            "description": p.get("description"),
        }
        for p in projects
    ]


@router.get("/connect/{provider}")
async def connect_account(provider: str, return_to: str | None = None, user: dict = Depends(get_current_user)):
    state = secrets.token_urlsafe(32)
    state_data = {"user_id": user["id"], "provider": provider}
    if return_to:
        state_data["return_to"] = return_to

    if provider == "x":
        verifier, challenge = XAPIClient.generate_pkce()
        state_data["code_verifier"] = verifier
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

    _save_state(state, state_data)
    return {"auth_url": url, "state": state}


@router.get("/callback/{provider}")
async def oauth_callback(provider: str, code: str, state: str):
    stored = _pop_state(state)
    if not stored or stored.get("provider") != provider:
        raise AppError("Invalid or expired OAuth state", 400)

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
            "profile_data": {"name": user_info.get("name")},
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
            "profile_data": {"name": user_info.get("name")},
            "is_active": True,
        }

    else:
        raise AppError(f"Unsupported provider: {provider}", 400)

    supabase.table("connected_accounts").upsert(
        account_data,
        on_conflict="user_id,provider,provider_user_id",
    ).execute()

    # Redirect to return_to if provided (e.g. onboarding flow), otherwise /projects
    return_to = stored.get("return_to", f"/projects?connected={provider}")
    redirect_url = return_to if return_to.startswith("http") else f"{settings.frontend_url}{return_to}"
    return RedirectResponse(url=redirect_url)


@router.delete("/{account_id}", status_code=204)
async def disconnect_account(account_id: str, user: dict = Depends(get_current_user)):
    result = (
        supabase.table("connected_accounts")
        .update({"is_active": False})
        .eq("id", account_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not result.data:
        raise NotFoundError("Account", account_id)
