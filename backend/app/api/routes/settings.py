"""User settings management."""
import hashlib
import secrets

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.dependencies.auth import get_current_user
from app.core.supabase import supabase, safe_maybe_single

router = APIRouter(prefix="/settings", tags=["settings"])


# ─── Profile ────────────────────────────────────────────────

@router.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    result = supabase.auth.admin.get_user_by_id(user["id"])
    u = result.user
    return {
        "id": u.id,
        "email": u.email,
        "name": u.user_metadata.get("full_name", ""),
        "avatar_url": u.user_metadata.get("avatar_url"),
    }


class ProfileUpdate(BaseModel):
    name: str | None = None


@router.patch("/profile")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    metadata: dict = {}
    if body.name is not None:
        metadata["full_name"] = body.name
    if metadata:
        supabase.auth.admin.update_user_by_id(user["id"], {"user_metadata": metadata})
    return {"ok": True}


# ─── Notifications ──────────────────────────────────────────

class NotificationPrefs(BaseModel):
    deploy: bool = True
    issue: bool = True
    weekly_report: bool = True
    security: bool = True
    marketing: bool = False


@router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    try:
        data = safe_maybe_single(
            supabase.table("user_preferences")
            .select("notifications")
            .eq("user_id", user["id"])
        )
        if data and data.get("notifications"):
            return data["notifications"]
    except Exception:
        pass
    return NotificationPrefs().model_dump()


@router.patch("/notifications")
async def update_notifications(body: NotificationPrefs, user: dict = Depends(get_current_user)):
    supabase.table("user_preferences").upsert(
        {"user_id": user["id"], "notifications": body.model_dump()},
        on_conflict="user_id",
    ).execute()
    return {"ok": True}


# ─── API Keys ───────────────────────────────────────────────

@router.get("/api-keys")
async def list_api_keys(user: dict = Depends(get_current_user)):
    try:
        result = (
            supabase.table("api_keys")
            .select("id, name, key_prefix, created_at, last_used_at")
            .eq("user_id", user["id"])
            .order("created_at", desc=True)
            .execute()
        )
        return result.data
    except Exception:
        return []


class ApiKeyCreate(BaseModel):
    name: str


@router.post("/api-keys", status_code=201)
async def create_api_key(body: ApiKeyCreate, user: dict = Depends(get_current_user)):
    raw_key = f"lp_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:12]

    result = supabase.table("api_keys").insert({
        "user_id": user["id"],
        "name": body.name,
        "key_hash": key_hash,
        "key_prefix": key_prefix,
    }).execute()

    return {**result.data[0], "key": raw_key}


@router.delete("/api-keys/{key_id}", status_code=204)
async def delete_api_key(key_id: str, user: dict = Depends(get_current_user)):
    supabase.table("api_keys").delete().eq("id", key_id).eq("user_id", user["id"]).execute()
