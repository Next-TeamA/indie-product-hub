"""Scheduled agent tasks -- uses skill-based agent loop."""

from app.core.supabase import supabase
from app.agents.core import build_agent_context, run_agent


async def daily_project_health_check():
    """Run health check skill for every active project.
    Creates alerts with findings. Runs daily at 9:30 UTC.
    """
    projects = (
        supabase.table("projects")
        .select("id, user_id, name")
        .execute()
    )
    for project in projects.data or []:
        try:
            context = await build_agent_context(project["id"], project["user_id"], max_iterations=5)
            # Agent auto-selects health_check.md skill based on task keywords
            result = await run_agent(
                context=context,
                task="Run a daily health check. Check recent deployments, open issues, and SNS performance. Report anything that needs attention.",
            )

            if result.answer and result.answer.strip():
                supabase.table("alerts").insert({
                    "user_id": project["user_id"],
                    "project_id": project["id"],
                    "alert_type": "system",
                    "severity": "info",
                    "title": f"Daily health check: {project.get('name', 'Project')}",
                    "message": result.answer[:500],
                }).execute()
        except Exception:
            continue
