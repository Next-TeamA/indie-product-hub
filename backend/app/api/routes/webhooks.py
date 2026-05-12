"""Incoming webhook handlers for Vercel, Railway, GitHub."""

import hmac
import hashlib

from fastapi import APIRouter, Request

from app.core.config import settings
from app.core.supabase import supabase

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _verify_github_signature(payload: bytes, signature: str) -> bool:
    if not settings.github_webhook_secret:
        return True  # Skip verification if secret not configured
    expected = "sha256=" + hmac.new(
        settings.github_webhook_secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/github")
async def github_webhook(request: Request):
    """Handle GitHub push, PR, issue, deployment_status events."""
    body = await request.body()
    signature = request.headers.get("x-hub-signature-256", "")

    if not _verify_github_signature(body, signature):
        return {"error": "Invalid signature"}, 401

    payload = await request.json()
    event_type = request.headers.get("x-github-event", "")

    # Find project by repo URL
    repo_name = payload.get("repository", {}).get("full_name", "")
    if not repo_name:
        return {"ok": True}

    project = (
        supabase.table("projects")
        .select("id, user_id")
        .or_(f"github_repo_url.ilike.%{repo_name}%")
        .maybe_single()
        .execute()
    )
    if not project.data:
        return {"ok": True, "skipped": "No matching project"}

    project_id = project.data["id"]
    user_id = project.data["user_id"]

    if event_type == "deployment_status":
        deployment = payload.get("deployment", {})
        status_state = payload.get("deployment_status", {}).get("state", "")
        status_map = {"success": "ready", "failure": "error", "pending": "deploying"}

        supabase.table("deployment_logs").upsert({
            "project_id": project_id,
            "platform": "github",
            "deployment_id": str(deployment.get("id", "")),
            "deployment_url": deployment.get("url"),
            "commit_sha": deployment.get("sha"),
            "branch": deployment.get("ref"),
            "status": status_map.get(status_state, "deploying"),
        }, on_conflict="project_id,deployment_id").execute()

        if status_state == "failure":
            supabase.table("alerts").insert({
                "user_id": user_id,
                "project_id": project_id,
                "alert_type": "deploy_error",
                "severity": "critical",
                "title": f"Deploy failed: {deployment.get('ref', 'unknown')}",
                "message": payload.get("deployment_status", {}).get("description", "Deployment failed"),
                "source_table": "deployment_logs",
            }).execute()

    return {"ok": True}


@router.post("/vercel")
async def vercel_webhook(request: Request):
    """Handle Vercel deployment events."""
    payload = await request.json()
    event_type = payload.get("type", "")

    if event_type not in ("deployment.created", "deployment.succeeded", "deployment.error"):
        return {"ok": True}

    deployment = payload.get("payload", {}).get("deployment", payload.get("payload", {}))
    project_id_vercel = deployment.get("projectId", "")

    project = (
        supabase.table("projects")
        .select("id, user_id")
        .eq("deploy_project_id", project_id_vercel)
        .maybe_single()
        .execute()
    )
    if not project.data:
        return {"ok": True, "skipped": "No matching project"}

    project_id = project.data["id"]
    user_id = project.data["user_id"]

    status_map = {
        "deployment.created": "building",
        "deployment.succeeded": "ready",
        "deployment.error": "error",
    }

    supabase.table("deployment_logs").insert({
        "project_id": project_id,
        "platform": "vercel",
        "deployment_id": deployment.get("id", ""),
        "deployment_url": deployment.get("url"),
        "commit_sha": deployment.get("meta", {}).get("githubCommitSha"),
        "commit_message": deployment.get("meta", {}).get("githubCommitMessage"),
        "branch": deployment.get("meta", {}).get("githubCommitRef"),
        "status": status_map.get(event_type, "building"),
    }).execute()

    if event_type == "deployment.error":
        supabase.table("alerts").insert({
            "user_id": user_id,
            "project_id": project_id,
            "alert_type": "deploy_error",
            "severity": "critical",
            "title": "Vercel deployment failed",
            "message": f"Deployment {deployment.get('id', 'unknown')[:8]} failed",
            "source_table": "deployment_logs",
        }).execute()
    elif event_type == "deployment.succeeded":
        supabase.table("alerts").insert({
            "user_id": user_id,
            "project_id": project_id,
            "alert_type": "deploy_success",
            "severity": "success",
            "title": "Deployment live",
            "message": f"Deployed to {deployment.get('url', 'production')}",
            "source_table": "deployment_logs",
        }).execute()

    return {"ok": True}


@router.post("/railway")
async def railway_webhook(request: Request):
    """Handle Railway deployment events."""
    payload = await request.json()
    status = payload.get("status", "")
    deployment_id = payload.get("deployment", {}).get("id", payload.get("id", ""))

    project = (
        supabase.table("projects")
        .select("id, user_id")
        .eq("deploy_project_id", payload.get("project", {}).get("id", ""))
        .maybe_single()
        .execute()
    )
    if not project.data:
        return {"ok": True}

    project_id = project.data["id"]
    user_id = project.data["user_id"]

    status_map = {"SUCCESS": "ready", "FAILED": "error", "CRASHED": "error", "BUILDING": "building", "DEPLOYING": "deploying"}

    supabase.table("deployment_logs").insert({
        "project_id": project_id,
        "platform": "railway",
        "deployment_id": str(deployment_id),
        "status": status_map.get(status, "building"),
    }).execute()

    if status in ("FAILED", "CRASHED"):
        supabase.table("alerts").insert({
            "user_id": user_id,
            "project_id": project_id,
            "alert_type": "deploy_error",
            "severity": "critical",
            "title": f"Railway deploy {status.lower()}",
            "message": f"Deployment {str(deployment_id)[:8]} {status.lower()}",
            "source_table": "deployment_logs",
        }).execute()

    return {"ok": True}
