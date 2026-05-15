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


async def daily_market_analysis():
    """Agent-driven market analysis for every active project.
    Uses accumulated knowledge base + market insights + Threads data
    to generate project-specific competitive analysis.
    Runs daily at 10:00 UTC (after market insights at 8:00).
    """
    projects = (
        supabase.table("projects")
        .select("id, user_id, name, description")
        .execute()
    )
    for project in projects.data or []:
        try:
            context = await build_agent_context(project["id"], project["user_id"], max_iterations=8)

            # Count accumulated insights for this project
            insight_count = supabase.table("market_insights").select("id", count="exact").eq("project_id", project["id"]).execute()
            total_insights = insight_count.count or 0

            task = f"""Analyze the market position of "{project.get('name', 'Project')}".

You have access to {total_insights} accumulated market insights and the project's full knowledge base.

Do the following:
1. Read the project's knowledge base (README, recent commits, SNS metrics, deploy history)
2. Check stored market insights for competitor activity and trends
3. If Threads is connected, search for relevant posts about our product category
4. Check if anyone mentioned our product on Threads

Based on ALL this data, produce a strategic analysis:
- What are our competitors doing that we're not?
- Where is our product weak compared to alternatives?
- What specific opportunity should we act on THIS WEEK?
- Is there an urgent threat we need to respond to?

Be brutally honest and specific. Reference actual data from the tools.
This analysis gets better over time as more data accumulates."""

            result = await run_agent(context=context, task=task)

            if result.answer and result.answer.strip():
                # Save as a market insight with type "analysis"
                supabase.table("market_insights").insert({
                    "project_id": project["id"],
                    "insight_type": "opportunity",
                    "title": f"Daily strategic analysis: {project.get('name', '')}",
                    "summary": result.answer[:1000],
                    "detail": f"Agent used {len(result.tool_calls)} tools across {result.iterations} iterations.",
                    "relevance_score": 0.9,
                    "is_urgent": False,
                    "generated_by": "launchpad-agent",
                }).execute()

                # Also update knowledge base with this analysis
                supabase.table("project_knowledge").upsert({
                    "project_id": project["id"],
                    "category": "market_context",
                    "title": "Latest market analysis",
                    "content": result.answer[:3000],
                }, on_conflict="project_id,category").execute()

        except Exception:
            continue
