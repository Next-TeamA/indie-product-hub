from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.exceptions import NotFoundError, ValidationError
from app.core.supabase import supabase
from app.models.issue import IssueCreate, IssueUpdate

router = APIRouter(prefix="/projects/{project_id}/issues", tags=["issues"])


@router.get("")
async def list_issues(
    project_id: str,
    status: str | None = None,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    query = (
        supabase.table("issues")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
    )
    if status:
        query = query.eq("status", status)

    result = query.execute()
    return result.data


@router.post("", status_code=201)
async def create_issue(
    project_id: str,
    body: IssueCreate,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    data = {
        "project_id": project_id,
        "user_id": user["id"],
        "title": body.title,
        "description": body.description,
        "severity": body.severity,
        "category": body.category,
        "status": "open",
    }
    result = supabase.table("issues").insert(data).execute()
    return result.data[0]


@router.patch("/{issue_id}")
async def update_issue(
    project_id: str,
    issue_id: str,
    body: IssueUpdate,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise ValidationError("No fields to update")

    result = (
        supabase.table("issues")
        .update(updates)
        .eq("id", issue_id)
        .eq("project_id", project_id)
        .execute()
    )
    if not result.data:
        raise NotFoundError("Issue", issue_id)
    return result.data[0]


@router.delete("/{issue_id}", status_code=204)
async def delete_issue(
    project_id: str,
    issue_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    result = (
        supabase.table("issues")
        .delete()
        .eq("id", issue_id)
        .eq("project_id", project_id)
        .execute()
    )
    if not result.data:
        raise NotFoundError("Issue", issue_id)
