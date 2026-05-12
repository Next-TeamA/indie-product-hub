"""Deployment log retrieval and sync."""

from fastapi import APIRouter, Depends, BackgroundTasks

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.supabase import supabase
from app.integrations.vercel_api import vercel_client
from app.integrations.railway_api import railway_client

router = APIRouter(prefix="/projects/{project_id}/deployments", tags=["deployments"])


@router.get("")
async def list_deployments(
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    result = (
        supabase.table("deployment_logs")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return result.data


@router.post("/sync")
async def sync_deployments(
    project_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    project: dict = Depends(verify_project_access),
):
    """Manually trigger deployment sync from Vercel/Railway."""
    platform = project.get("deploy_platform")
    deploy_id = project.get("deploy_project_id")

    if not platform or not deploy_id:
        return {"status": "skipped", "message": "No deployment platform configured"}

    background_tasks.add_task(_sync_deployments, project_id, platform, deploy_id)
    return {"status": "syncing"}


async def _sync_deployments(project_id: str, platform: str, deploy_project_id: str):
    """Background: pull latest deployments from platform."""
    try:
        if platform == "vercel":
            deployments = await vercel_client.list_deployments(deploy_project_id)
            for d in deployments[:10]:
                status_map = {"READY": "ready", "ERROR": "error", "BUILDING": "building", "QUEUED": "building", "CANCELED": "cancelled"}
                supabase.table("deployment_logs").upsert({
                    "project_id": project_id,
                    "platform": "vercel",
                    "deployment_id": d.get("uid", d.get("id", "")),
                    "deployment_url": d.get("url"),
                    "status": status_map.get(d.get("readyState", d.get("state", "")), "building"),
                    "created_at": d.get("createdAt"),
                }, on_conflict="project_id,deployment_id").execute()

        elif platform == "railway":
            deployments = await railway_client.list_deployments(deploy_project_id)
            for d in deployments[:10]:
                status_map = {"SUCCESS": "ready", "FAILED": "error", "CRASHED": "error", "BUILDING": "building", "DEPLOYING": "deploying"}
                supabase.table("deployment_logs").upsert({
                    "project_id": project_id,
                    "platform": "railway",
                    "deployment_id": d.get("id", ""),
                    "deployment_url": d.get("staticUrl"),
                    "status": status_map.get(d.get("status", ""), "building"),
                    "created_at": d.get("createdAt"),
                }, on_conflict="project_id,deployment_id").execute()
    except Exception:
        pass
