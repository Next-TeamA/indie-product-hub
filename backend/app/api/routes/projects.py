from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user
from app.core.encryption import decrypt_token
from app.core.exceptions import NotFoundError, ValidationError
from app.core.supabase import supabase, safe_maybe_single
from app.integrations.vercel_api import vercel_client
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
    # Enrich with issue counts
    projects = result.data or []
    for proj in projects:
        issues = (
            supabase.table("issues")
            .select("id", count="exact")
            .eq("project_id", proj["id"])
            .neq("status", "resolved")
            .execute()
        )
        proj["open_issue_count"] = issues.count if issues.count is not None else 0
    return projects


@router.get("/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    data = safe_maybe_single(
        supabase.table("projects")
        .select("*")
        .eq("id", project_id)
        .eq("user_id", user["id"])
    )
    if not data:
        raise NotFoundError("Project", project_id)
    return data


@router.post("", status_code=201)
async def create_project(body: ProjectCreate, user: dict = Depends(get_current_user)):
    data = {
        "user_id": user["id"],
        "name": body.name,
        "description": body.description,
        "prd": body.prd,
        "github_repo_url": body.github_repo_url,
        "github_repo_owner": body.github_repo_owner,
        "github_repo_name": body.github_repo_name,
        "deploy_platform": body.deploy_platform,
        "deploy_project_id": body.deploy_project_id,
        "sns_channels": body.sns_channels,
        "status": "preparing",
    }
    result = supabase.table("projects").insert(data).execute()
    project = result.data[0]

    # Auto-create promotion info so the promotion page never crashes
    supabase.table("project_promotion_info").insert({
        "project_id": project["id"],
        "service_name": body.name,
        "description": body.description or "",
    }).execute()

    # Initialize workspace with skills and knowledge structure
    try:
        from app.workspace.workspace_init import init_workspace
        await init_workspace(project["id"], body.name, body.description or "")
    except Exception:
        pass  # Workspace init is non-critical

    return project


@router.patch("/{project_id}")
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    user: dict = Depends(get_current_user),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise ValidationError("No fields to update")

    # Auto-fill deploy_url from Vercel when deploy_project_id is set
    if updates.get("deploy_project_id") and updates.get("deploy_platform") == "vercel":
        if not updates.get("deploy_url"):
            try:
                account = safe_maybe_single(
                    supabase.table("connected_accounts")
                    .select("access_token")
                    .eq("user_id", user["id"])
                    .eq("provider", "vercel")
                    .eq("is_active", True)
                )
                if account:
                    token = decrypt_token(account["access_token"])
                    projects = await vercel_client.list_projects(token)
                    for p in projects:
                        if p.get("id") == updates["deploy_project_id"]:
                            # Use production domain or Vercel default
                            domains = p.get("targets", {}).get("production", {}).get("alias", [])
                            if domains:
                                updates["deploy_url"] = f"https://{domains[0]}"
                            elif p.get("alias"):
                                aliases = p["alias"]
                                if isinstance(aliases, list) and aliases:
                                    updates["deploy_url"] = f"https://{aliases[0].get('domain', '') if isinstance(aliases[0], dict) else aliases[0]}"
                            if not updates.get("deploy_url"):
                                # Fallback: use Vercel's default domain
                                name = p.get("name", "")
                                if name:
                                    updates["deploy_url"] = f"https://{name}.vercel.app"
                            break
            except Exception:
                pass

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
