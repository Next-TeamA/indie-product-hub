"""Voice samples (persona training corpus) management."""

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.exceptions import NotFoundError
from app.core.supabase import supabase

router = APIRouter(prefix="/projects/{project_id}/voice-samples", tags=["voice-samples"])


@router.get("")
async def list_voice_samples(
    project_id: str,
    limit: int = 100,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """List voice_samples for the persona page (latest first)."""
    rows = (
        supabase.table("voice_samples")
        .select(
            "id, source_platform, source_post_id, content, lang, "
            "engagement_score, used_for_training, created_at"
        )
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
        .data
    )
    return rows


@router.delete("/{sample_id}", status_code=204)
async def delete_voice_sample(
    project_id: str,
    sample_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Remove a single voice sample (also drops its vector from RAG)."""
    result = (
        supabase.table("voice_samples")
        .delete()
        .eq("id", sample_id)
        .eq("project_id", project_id)
        .execute()
    )
    if not result.data:
        raise NotFoundError("VoiceSample", sample_id)
