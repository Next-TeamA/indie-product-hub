"""Deployment log retrieval and sync -- uses per-user OAuth tokens."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, BackgroundTasks

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.encryption import decrypt_token
from app.core.supabase import supabase, safe_maybe_single
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
    """Manually trigger deployment sync using user's connected account."""
    platform = project.get("deploy_platform")
    deploy_id = project.get("deploy_project_id")

    if not platform or not deploy_id:
        return {"status": "skipped", "message": "No deployment platform configured"}

    # Get user's token for the platform
    account = safe_maybe_single(
        supabase.table("connected_accounts")
        .select("access_token")
        .eq("user_id", user["id"])
        .eq("provider", platform)
        .eq("is_active", True)
    )
    if not account:
        return {"status": "skipped", "message": f"No connected {platform} account"}

    token = decrypt_token(account["access_token"])
    background_tasks.add_task(_sync_deployments, project_id, platform, deploy_id, token)
    return {"status": "syncing"}


def _epoch_to_iso(ms: int | None) -> str | None:
    if not ms:
        return None
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).isoformat()


async def _sync_deployments(project_id: str, platform: str, deploy_project_id: str, token: str):
    """Background: pull latest deployments using user's OAuth token."""
    try:
        if platform == "vercel":
            deployments = await vercel_client.list_deployments(token, deploy_project_id)
            for d in deployments[:10]:
                status_map = {"READY": "ready", "ERROR": "error", "BUILDING": "building", "QUEUED": "building", "CANCELED": "cancelled"}
                meta = d.get("meta", {})
                created_ts = d.get("created") or d.get("createdAt")
                supabase.table("deployment_logs").upsert({
                    "project_id": project_id,
                    "platform": "vercel",
                    "deployment_id": d.get("uid", d.get("id", "")),
                    "deployment_url": d.get("url"),
                    "commit_sha": (meta.get("githubCommitSha") or "")[:40] or None,
                    "commit_message": (meta.get("githubCommitMessage") or "")[:200] or None,
                    "branch": (meta.get("githubCommitRef") or "")[:100] or None,
                    "status": status_map.get(d.get("readyState", d.get("state", "")), "building"),
                    **({"started_at": _epoch_to_iso(created_ts)} if created_ts else {}),
                }, on_conflict="project_id,deployment_id").execute()

        elif platform == "railway":
            deployments = await railway_client.list_deployments(token, deploy_project_id)
            for d in deployments[:10]:
                status_map = {"SUCCESS": "ready", "FAILED": "error", "CRASHED": "error", "BUILDING": "building", "DEPLOYING": "deploying"}
                supabase.table("deployment_logs").upsert({
                    "project_id": project_id,
                    "platform": "railway",
                    "deployment_id": d.get("id", ""),
                    "deployment_url": d.get("staticUrl"),
                    "status": status_map.get(d.get("status", ""), "building"),
                }, on_conflict="project_id,deployment_id").execute()
    except Exception:
        pass
