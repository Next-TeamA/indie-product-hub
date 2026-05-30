"""Persona & Voice 학습 endpoints (기획서 §8).

- GET    /projects/{project_id}/persona              현재 페르소나 조회
- POST   /projects/{project_id}/persona/import-voice 과거 글 import + 인덱싱
- POST   /projects/{project_id}/persona/build        voice 분석 → persona 추출
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.supabase import supabase, safe_maybe_single
from app.services import persona_builder

router = APIRouter(prefix="/projects/{project_id}/persona", tags=["persona"])


class ImportVoiceRequest(BaseModel):
    platform: str  # "x" | "threads"
    count: int = 50


@router.get("")
async def get_persona(
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Read the project's persona row (null if not built yet)."""
    persona = safe_maybe_single(
        supabase.table("personas")
        .select("*")
        .eq("project_id", project_id)
    )
    return {"persona": persona}


@router.post("/import-voice")
async def import_voice(
    project_id: str,
    body: ImportVoiceRequest,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Pull recent X/Threads posts → voice_samples + index for RAG."""
    result = await persona_builder.import_voice_samples(
        project_id=project_id,
        user_id=user["id"],
        platform=body.platform,
        count=body.count,
    )
    return result


@router.post("/build")
async def build_persona_endpoint(
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Analyze voice_samples with the LLM and upsert the persona."""
    persona = await persona_builder.build_persona(project_id)
    return {"persona": persona}
