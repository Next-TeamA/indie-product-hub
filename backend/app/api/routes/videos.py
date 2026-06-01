"""Video projects + media assets read API for frontend gallery.

영상 생성은 /api/projects/{id}/amp/run (graph="video_production") 으로 트리거.
이 라우트는 조회 전용 (gallery + status polling).
"""

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.exceptions import NotFoundError
from app.core.supabase import safe_maybe_single, supabase

router = APIRouter(prefix="/projects/{project_id}", tags=["videos"])


@router.get("/videos")
async def list_videos(
    project_id: str,
    status: str | None = None,
    limit: int = 30,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """List video_projects for the gallery (latest first)."""
    query = (
        supabase.table("video_projects")
        .select(
            "id, title, status, progress_percent, model, aspect_ratio, "
            "total_duration_seconds, total_cost_usd, final_asset_id, "
            "error_message, created_at, completed_at"
        )
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .limit(limit)
    )
    if status:
        query = query.eq("status", status)
    return query.execute().data


@router.get("/videos/{video_id}")
async def get_video(
    project_id: str,
    video_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Single video_project with its scenes + final asset URL."""
    video = safe_maybe_single(
        supabase.table("video_projects")
        .select("*")
        .eq("id", video_id)
        .eq("project_id", project_id)
    )
    if not video:
        raise NotFoundError("Video", video_id)

    scenes = (
        supabase.table("video_scenes")
        .select(
            "id, scene_index, description, duration_seconds, prompt, "
            "asset_id, status, retry_count, "
            "generation_started_at, generation_completed_at"
        )
        .eq("video_project_id", video_id)
        .order("scene_index")
        .execute()
        .data
    )

    final_asset = None
    if video.get("final_asset_id"):
        final_asset = safe_maybe_single(
            supabase.table("media_assets")
            .select("id, storage_url, thumbnail_url, duration_seconds")
            .eq("id", video["final_asset_id"])
        )

    return {"video": video, "scenes": scenes, "final_asset": final_asset}


@router.get("/media-assets")
async def list_media_assets(
    project_id: str,
    asset_type: str | None = None,
    limit: int = 60,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Gallery feed -- media assets sorted by created_at desc."""
    query = (
        supabase.table("media_assets")
        .select(
            "id, asset_type, source, ai_model, storage_url, thumbnail_url, "
            "duration_seconds, width, height, cost_usd, quality_score, created_at"
        )
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .limit(limit)
    )
    if asset_type:
        query = query.eq("asset_type", asset_type)
    return query.execute().data
