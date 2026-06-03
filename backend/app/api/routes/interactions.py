"""Interactions read API -- mentions/replies/DMs.

프론트 mention picker가 답글 보낼 대상 고를 때 사용.
"""

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.supabase import supabase

router = APIRouter(prefix="/projects/{project_id}", tags=["interactions"])


@router.get("/interactions")
async def list_interactions(
    project_id: str,
    reply_status: str | None = None,
    limit: int = 30,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """List interactions (mentions/replies/DMs). Default: latest first."""
    query = (
        supabase.table("interactions")
        .select(
            "id, platform, interaction_type, external_id, sender_username, "
            "sender_profile, content, classification, priority, "
            "reply_status, reply_sent_at, draft_reply, detected_at"
        )
        .eq("project_id", project_id)
        .order("detected_at", desc=True)
        .limit(limit)
    )
    if reply_status:
        query = query.eq("reply_status", reply_status)
    return query.execute().data
