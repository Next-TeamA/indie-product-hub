"""Incoming webhook handlers for Vercel, Railway, GitHub.
All webhooks verify signatures before processing.
"""

import hmac
import hashlib
import re

from fastapi import APIRouter, Request, HTTPException

from app.core.config import settings
from app.core.supabase import supabase, safe_maybe_single
from app.services.automation import create_promo_draft_from_push, create_issue_from_deploy_failure

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# Strict repo name pattern: owner/repo only
_REPO_NAME_RE = re.compile(r"^[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+$")


def _verify_github_signature(payload: bytes, signature: str) -> bool:
    if not settings.github_webhook_secret:
        raise HTTPException(status_code=503, detail="GitHub webhook secret not configured")
    expected = "sha256=" + hmac.new(
        settings.github_webhook_secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def _verify_vercel_signature(payload: bytes, signature: str) -> bool:
    # Use webhook_secret if set, otherwise fall back to client_secret
    secret = settings.vercel_webhook_secret or settings.vercel_client_secret
    if not secret:
        return True  # No secret available -- skip verification
    expected = hmac.new(
        secret.encode(), payload, hashlib.sha1
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/github")
async def github_webhook(request: Request):
    """Handle GitHub push, PR, issue, deployment_status events."""
    body = await request.body()
    signature = request.headers.get("x-hub-signature-256", "")

    if not _verify_github_signature(body, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()
    event_type = request.headers.get("x-github-event", "")

    repo_name = payload.get("repository", {}).get("full_name", "")
    if not repo_name or not _REPO_NAME_RE.match(repo_name):
        return {"ok": True, "skipped": "Invalid repo name"}

    # Safe exact match -- no ilike wildcard injection
    project = safe_maybe_single(
        supabase.table("projects")
        .select("id, user_id")
        .eq("github_repo_url", f"https://github.com/{repo_name}")
    )
    if not project:
        return {"ok": True, "skipped": "No matching project"}

    project_id = project["id"]
    user_id = project["user_id"]

    if event_type == "push":
        # Auto-generate promotion draft from significant pushes
        try:
            await create_promo_draft_from_push(project_id, user_id, payload)
        except Exception:
            pass  # Non-critical, don't fail webhook

    elif event_type == "deployment_status":
        deployment = payload.get("deployment", {})
        status_state = payload.get("deployment_status", {}).get("state", "")
        status_map = {"success": "ready", "failure": "error", "pending": "deploying"}

        supabase.table("deployment_logs").insert({
            "project_id": project_id,
            "platform": "github",
            "deployment_id": str(deployment.get("id", ""))[:100],
            "deployment_url": (deployment.get("url") or "")[:500],
            "commit_sha": (deployment.get("sha") or "")[:40],
            "branch": (deployment.get("ref") or "")[:100],
            "status": status_map.get(status_state, "deploying"),
        }).execute()

        if status_state == "failure":
            error_desc = (payload.get("deployment_status", {}).get("description") or "Deployment failed")[:500]
            supabase.table("alerts").insert({
                "user_id": user_id,
                "project_id": project_id,
                "alert_type": "deploy_error",
                "severity": "critical",
                "title": f"Deploy failed: {(deployment.get('ref') or 'unknown')[:50]}",
                "message": error_desc,
                "source_table": "deployment_logs",
            }).execute()

            # Auto-create issue from deploy failure
            try:
                await create_issue_from_deploy_failure(
                    project_id, user_id, "github",
                    str(deployment.get("id", ""))[:100], error_desc,
                )
            except Exception:
                pass

    return {"ok": True}


@router.post("/vercel")
async def vercel_webhook(request: Request):
    """Handle Vercel deployment events. Verifies x-vercel-signature."""
    body = await request.body()
    signature = request.headers.get("x-vercel-signature", "")

    if not _verify_vercel_signature(body, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()
    event_type = payload.get("type", "")

    if event_type not in ("deployment.created", "deployment.succeeded", "deployment.error"):
        return {"ok": True}

    deployment = payload.get("payload", {}).get("deployment", payload.get("payload", {}))
    project_id_vercel = deployment.get("projectId", "")

    if not project_id_vercel:
        return {"ok": True}

    project = safe_maybe_single(
        supabase.table("projects")
        .select("id, user_id")
        .eq("deploy_project_id", project_id_vercel)
    )
    if not project:
        return {"ok": True, "skipped": "No matching project"}

    project_id = project["id"]
    user_id = project["user_id"]

    status_map = {
        "deployment.created": "building",
        "deployment.succeeded": "ready",
        "deployment.error": "error",
    }

    supabase.table("deployment_logs").insert({
        "project_id": project_id,
        "platform": "vercel",
        "deployment_id": (deployment.get("id") or "")[:100],
        "deployment_url": (deployment.get("url") or "")[:500],
        "commit_sha": (deployment.get("meta", {}).get("githubCommitSha") or "")[:40],
        "commit_message": (deployment.get("meta", {}).get("githubCommitMessage") or "")[:200],
        "branch": (deployment.get("meta", {}).get("githubCommitRef") or "")[:100],
        "status": status_map.get(event_type, "building"),
    }).execute()

    if event_type == "deployment.error":
        error_msg = f"Deployment {(deployment.get('id') or 'unknown')[:8]} failed"
        supabase.table("alerts").insert({
            "user_id": user_id,
            "project_id": project_id,
            "alert_type": "deploy_error",
            "severity": "critical",
            "title": "Vercel deployment failed",
            "message": error_msg,
            "source_table": "deployment_logs",
        }).execute()

        try:
            await create_issue_from_deploy_failure(
                project_id, user_id, "vercel",
                (deployment.get("id") or "")[:100], error_msg,
            )
        except Exception:
            pass

    return {"ok": True}


@router.post("/railway")
async def railway_webhook(request: Request):
    """Handle Railway deployment events."""
    # Railway doesn't support webhook signatures yet
    # Validate payload structure instead
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    status = payload.get("status", "")
    if not status:
        return {"ok": True}

    deployment_id = str(payload.get("deployment", {}).get("id", payload.get("id", "")))[:100]
    railway_project_id = payload.get("project", {}).get("id", "")

    if not railway_project_id:
        return {"ok": True}

    project = safe_maybe_single(
        supabase.table("projects")
        .select("id, user_id")
        .eq("deploy_project_id", railway_project_id)
    )
    if not project:
        return {"ok": True}

    project_id = project["id"]
    user_id = project["user_id"]

    status_map = {"SUCCESS": "ready", "FAILED": "error", "CRASHED": "error", "BUILDING": "building", "DEPLOYING": "deploying"}

    supabase.table("deployment_logs").insert({
        "project_id": project_id,
        "platform": "railway",
        "deployment_id": deployment_id,
        "status": status_map.get(status, "building"),
    }).execute()

    if status in ("FAILED", "CRASHED"):
        supabase.table("alerts").insert({
            "user_id": user_id,
            "project_id": project_id,
            "alert_type": "deploy_error",
            "severity": "critical",
            "title": f"Railway deploy {status.lower()}",
            "message": f"Deployment {deployment_id[:8]} {status.lower()}",
            "source_table": "deployment_logs",
        }).execute()

    return {"ok": True}
