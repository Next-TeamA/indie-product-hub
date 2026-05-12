from fastapi import Depends

from app.api.dependencies.auth import get_current_user
from app.core.exceptions import NotFoundError
from app.core.supabase import supabase


async def verify_project_access(
    project_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """프로젝트가 존재하고 현재 사용자 소유인지 검증한다.

    검증 통과하면 project dict를 반환.
    route에서 Depends(verify_project_access)로 사용.
    """
    result = (
        supabase.table("projects")
        .select("*")
        .eq("id", project_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not result.data:
        raise NotFoundError("Project", project_id)
    return result.data
