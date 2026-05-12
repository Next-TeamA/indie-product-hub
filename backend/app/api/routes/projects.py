from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user
from app.core.exceptions import NotFoundError, ValidationError
from app.core.supabase import supabase
from app.models.project import ProjectCreate, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
async def list_projects(user: dict = Depends(get_current_user)):
    result = (
        supabase.table("projects")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    result = (
        supabase.table("projects")
        .select("*")
        .eq("id", project_id)
        .eq("user_id", user["id"])
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise NotFoundError("Project", project_id)
    return result.data


@router.post("", status_code=201)
async def create_project(body: ProjectCreate, user: dict = Depends(get_current_user)):
    data = {
        "user_id": user["id"],
        "name": body.name,
        "description": body.description,
        "prd": body.prd,
        "github_repo_url": body.github_repo_url,
        "sns_channels": body.sns_channels,
        "status": "preparing",
    }
    result = supabase.table("projects").insert(data).execute()
    return result.data[0]


@router.patch("/{project_id}")
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    user: dict = Depends(get_current_user),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise ValidationError("No fields to update")

    result = (
        supabase.table("projects")
        .update(updates)
        .eq("id", project_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not result.data:
        raise NotFoundError("Project", project_id)
    return result.data[0]


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    result = (
        supabase.table("projects")
        .delete()
        .eq("id", project_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not result.data:
        raise NotFoundError("Project", project_id)
