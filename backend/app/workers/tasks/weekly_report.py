"""Periodic task: generate weekly reports for all active projects.
Runs every Monday at 9:00 AM UTC.
"""

from app.core.supabase import supabase
from app.services.automation import generate_weekly_report


async def generate_weekly_reports():
    """Generate weekly report for each active project and notify users."""
    projects = (
        supabase.table("projects")
        .select("id, user_id, name")
        .eq("status", "active")
        .execute()
    )

    for project in projects.data or []:
        try:
            report = await generate_weekly_report(project["id"])

            # Create alert with report summary
            summary = report.get("report", {}).get("summary", "Weekly report ready")
            supabase.table("alerts").insert({
                "user_id": project["user_id"],
                "project_id": project["id"],
                "alert_type": "system",
                "severity": "info",
                "title": f"Weekly Report: {project['name']}",
                "message": summary[:500],
                "action_url": f"/projects/{project['id']}/insights",
            }).execute()

        except Exception:
            continue
