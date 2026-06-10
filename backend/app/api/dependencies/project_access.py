from fastapi import Depends

from app.api.dependencies.auth import get_current_user
from app.core.exceptions import AppError, NotFoundError
from app.core.supabase import safe_maybe_single, supabase


# role 권한 hierarchy: viewer < member < admin < owner
ROLE_RANK = {"viewer": 1, "member": 2, "admin": 3, "owner": 4}


async def verify_project_access(
    project_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """프로젝트가 존재하고 현재 사용자가 *어떤 role 이든* 멤버인지 검증.

    검증 통과 시 project dict 반환. project["_role"] 에 사용자 role 부착.
    """
    project = safe_maybe_single(
        supabase.table("projects").select("*").eq("id", project_id)
    )
    if not project:
        raise NotFoundError("Project", project_id)

    member = safe_maybe_single(
        supabase.table("project_members")
        .select("role")
        .eq("project_id", project_id)
        .eq("user_id", user["id"])
    )

    # legacy fallback: project_members 에 row 가 없는데 projects.user_id 가 본인이면
    # owner 로 간주 (migration 적용 전 환경 보호).
    if not member:
        if project.get("user_id") == user["id"]:
            member = {"role": "owner"}
        else:
            raise NotFoundError("Project", project_id)

    project["_role"] = member["role"]
    return project


def require_role(min_role: str):
    """admin / owner 만 허용하는 식의 강제 role gate.

    사용: ``_admin: dict = Depends(require_role("admin"))``
    """
    if min_role not in ROLE_RANK:
        raise ValueError(f"Unknown role: {min_role}")
    required = ROLE_RANK[min_role]

    async def _checker(project: dict = Depends(verify_project_access)) -> dict:
        actual = ROLE_RANK.get(project.get("_role", ""), 0)
        if actual < required:
            raise AppError(
                f"Permission denied: requires {min_role} or higher",
                403,
                "FORBIDDEN",
            )
        return project

    return _checker
