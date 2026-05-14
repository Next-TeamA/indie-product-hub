"""Internal project management tools for LaunchPad Agent."""

from app.agents.context import AgentContext
from app.agents.tools.registry import register_tool
from app.core.supabase import supabase


async def _get_project_issues(ctx: AgentContext, status: str = "open", limit: int = 20) -> dict:
    query = (
        supabase.table("issues")
        .select("id, title, description, severity, status, source, created_at, resolved_at")
        .eq("project_id", ctx.project_id)
        .order("created_at", desc=True)
        .limit(limit)
    )
    if status != "all":
        query = query.eq("status", status)
    result = query.execute()
    return {"issues": result.data or []}


async def _get_project_alerts(ctx: AgentContext, limit: int = 10) -> dict:
    result = (
        supabase.table("alerts")
        .select("id, alert_type, severity, title, message, is_read, created_at")
        .eq("user_id", ctx.user_id)
        .eq("project_id", ctx.project_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"alerts": result.data or []}


async def _create_alert(ctx: AgentContext, title: str = "", message: str = "", severity: str = "info") -> dict:
    if not title or not message:
        return {"error": "Title and message are required."}
    result = supabase.table("alerts").insert({
        "user_id": ctx.user_id,
        "project_id": ctx.project_id,
        "alert_type": "system",
        "severity": severity,
        "title": title,
        "message": message,
    }).execute()
    if result.data:
        return {"created": result.data[0]["id"]}
    return {"error": "Failed to create alert."}


async def _get_project_summary(ctx: AgentContext) -> dict:
    """Get a quick project summary from DB."""
    project = ctx.project
    issues = supabase.table("issues").select("status").eq("project_id", ctx.project_id).execute()
    posts = supabase.table("promotion_posts").select("status").eq("project_id", ctx.project_id).execute()
    deploys = supabase.table("deployment_logs").select("status").eq("project_id", ctx.project_id).execute()

    issue_data = issues.data or []
    post_data = posts.data or []
    deploy_data = deploys.data or []

    return {
        "name": project.get("name", ""),
        "description": project.get("description", ""),
        "github_repo": f"{project.get('github_repo_owner', '')}/{project.get('github_repo_name', '')}",
        "deploy_platform": project.get("deploy_platform", "none"),
        "issues_open": len([i for i in issue_data if i["status"] != "resolved"]),
        "issues_total": len(issue_data),
        "posts_published": len([p for p in post_data if p["status"] == "published"]),
        "posts_draft": len([p for p in post_data if p["status"] == "draft"]),
        "deploys_total": len(deploy_data),
        "deploys_failed": len([d for d in deploy_data if d["status"] == "error"]),
    }


def register_internal_tools():
    register_tool("internal_get_issues", "Get project issues from LaunchPad database",
        {"status": {"type": "string", "description": "Filter: open, resolved, or all"},
         "limit": {"type": "integer", "description": "Max issues"}},
        _get_project_issues, "internal")

    register_tool("internal_get_alerts", "Get recent alerts for this project",
        {"limit": {"type": "integer", "description": "Max alerts"}},
        _get_project_alerts, "internal")

    register_tool("internal_create_alert", "Create a new alert for the user",
        {"title": {"type": "string", "description": "Alert title"},
         "message": {"type": "string", "description": "Alert message"},
         "severity": {"type": "string", "description": "Severity: critical, warning, info, success"}},
        _create_alert, "internal")

    register_tool("internal_project_summary", "Get a quick summary of the project's current state",
        {}, _get_project_summary, "internal")
