"""Deploy monitoring tools for LaunchPad Agent."""

from app.agents.core import AgentContext
from app.agents.tools.registry import register_tool
from app.core.supabase import supabase
from app.integrations.vercel_api import vercel_client
from app.integrations.railway_api import railway_client


async def _get_deploy_logs(ctx: AgentContext, limit: int = 15) -> dict:
    """Get stored deployment logs (zero API cost)."""
    result = (
        supabase.table("deployment_logs")
        .select("id, platform, deployment_id, status, commit_sha, commit_message, branch, error_message, build_duration_ms, created_at")
        .eq("project_id", ctx.project_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"deployments": [
        {**d, "commit_sha": (d.get("commit_sha") or "")[:7], "created_at": (d.get("created_at") or "")[:16]}
        for d in (result.data or [])
    ]}


async def _get_vercel_deployments(ctx: AgentContext, limit: int = 10) -> dict:
    token = ctx.tokens.get("vercel")
    deploy_project_id = ctx.project.get("deploy_project_id")
    if not token:
        return {"error": "Vercel not connected."}
    if not deploy_project_id:
        return {"error": "No Vercel project linked."}
    deploys = await vercel_client.list_deployments(token, deploy_project_id, limit=limit)
    return {"deployments": [
        {"id": d.get("uid", ""), "state": d.get("state", ""), "url": d.get("url", ""),
         "created": d.get("created", 0), "source": d.get("source", "")}
        for d in deploys
    ]}


async def _get_vercel_deploy_events(ctx: AgentContext, deployment_id: str = "") -> dict:
    token = ctx.tokens.get("vercel")
    if not token or not deployment_id:
        return {"error": "Vercel not connected or missing deployment_id."}
    events = await vercel_client.get_deployment_events(token, deployment_id)
    # Extract last 30 log lines
    log_lines = []
    for ev in (events if isinstance(events, list) else []):
        text = ev.get("text", "") or ev.get("payload", {}).get("text", "")
        if text:
            log_lines.append(text)
    return {"logs": log_lines[-30:]}


async def _get_railway_deployments(ctx: AgentContext, service_id: str = "") -> dict:
    token = ctx.tokens.get("railway")
    if not token:
        return {"error": "Railway not connected."}
    if not service_id:
        return {"error": "No Railway service_id provided."}
    deploys = await railway_client.list_deployments(token, service_id)
    return {"deployments": deploys}


async def _get_deploy_stats(ctx: AgentContext) -> dict:
    """Compute deploy success rate from stored logs."""
    result = (
        supabase.table("deployment_logs")
        .select("status")
        .eq("project_id", ctx.project_id)
        .execute()
    )
    data = result.data or []
    total = len(data)
    if total == 0:
        return {"message": "No deployment data available."}
    success = len([d for d in data if d["status"] == "ready"])
    failed = len([d for d in data if d["status"] == "error"])
    return {
        "total": total,
        "success": success,
        "failed": failed,
        "success_rate": round(success / total * 100, 1),
    }


def register_deploy_tools():
    register_tool("deploy_get_logs", "Get stored deployment logs for this project (zero API cost)",
        {"limit": {"type": "integer", "description": "Max number of logs (default 15)"}},
        _get_deploy_logs, "deploy")

    register_tool("deploy_vercel_list", "List live Vercel deployments",
        {"limit": {"type": "integer", "description": "Max deployments (default 10)"}},
        _get_vercel_deployments, "deploy")

    register_tool("deploy_vercel_events", "Get build logs for a specific Vercel deployment",
        {"deployment_id": {"type": "string", "description": "Vercel deployment ID"}},
        _get_vercel_deploy_events, "deploy")

    register_tool("deploy_railway_list", "List Railway deployments for a service",
        {"service_id": {"type": "string", "description": "Railway service ID"}},
        _get_railway_deployments, "deploy")

    register_tool("deploy_stats", "Get deployment success/failure statistics",
        {}, _get_deploy_stats, "deploy")
