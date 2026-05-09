from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.core.supabase import supabase
from app.models.project import ProjectCreate, ProjectUpdate, ProjectResponse

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
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
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
        "status": "준비중",
    }
    result = supabase.table("projects").insert(data).execute()
    return result.data[0]


@router.patch("/{project_id}")
async def update_project(
    project_id: str, body: ProjectUpdate, user: dict = Depends(get_current_user)
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        supabase.table("projects")
        .update(updates)
        .eq("id", project_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return result.data[0]


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    supabase.table("projects").delete().eq("id", project_id).eq(
        "user_id", user["id"]
    ).execute()
