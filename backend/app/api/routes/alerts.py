"""Alert management."""

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user
from app.core.supabase import supabase

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
async def list_alerts(
    is_read: bool | None = None,
    severity: str | None = None,
    user: dict = Depends(get_current_user),
):
    query = (
        supabase.table("alerts")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .limit(50)
    )
    if is_read is not None:
        query = query.eq("is_read", is_read)
    if severity:
        query = query.eq("severity", severity)
    result = query.execute()
    return result.data


@router.patch("/{alert_id}/read")
async def mark_read(alert_id: str, user: dict = Depends(get_current_user)):
    supabase.table("alerts").update({
        "is_read": True,
        "read_at": "now()",
    }).eq("id", alert_id).eq("user_id", user["id"]).execute()
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    supabase.table("alerts").update({
        "is_read": True,
        "read_at": "now()",
    }).eq("user_id", user["id"]).eq("is_read", False).execute()
    return {"ok": True}
