"""Scheduled agent tasks -- autonomous project health checks."""

from app.core.supabase import supabase
from app.agents.core import build_agent_context, run_agent
from app.agents.prompts import DEPLOY_MONITOR_PROMPT
from app.agents.sub_agents import SUB_AGENT_CONFIGS
from app.agents.tools.registry import get_tools_for_domains


async def daily_project_health_check():
    """Run deploy_monitor sub-agent for every active project.
    Creates alerts with findings. Runs daily at 9:00 UTC.
    """
    projects = (
        supabase.table("projects")
        .select("id, user_id, name")
        .execute()
    )
    for project in projects.data or []:
        try:
            context = await build_agent_context(project["id"], project["user_id"], max_iterations=6)
            config = SUB_AGENT_CONFIGS["deploy_monitor"]
            project_readme = context.knowledge.get("project_readme", "")
            system_prompt = config.prompt_template.replace("{project_readme}", project_readme)
            declarations, handlers = get_tools_for_domains(config.domains)

            result = await run_agent(
                context=context,
                task="Run a daily health check. Check recent deployments, open issues, and SNS performance. Report anything that needs attention.",
                tool_declarations=declarations,
                tool_handlers=handlers,
                system_prompt=system_prompt,
            )

            if result.answer and "needs attention" in result.answer.lower() or result.tool_calls:
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
