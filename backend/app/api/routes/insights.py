"""Insights APIs -- marketing metrics aggregation + operations overview."""

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.supabase import supabase
from app.services.insight_engine import generate_marketing_insights

router = APIRouter(prefix="/projects/{project_id}/insights", tags=["insights"])


@router.get("/marketing")
async def get_marketing_insights(
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Marketing insights -- trend detection, platform comparison, best post analysis.

    Uses stored data (zero API cost). Covers both X and Threads.
    """
    return await generate_marketing_insights(project_id)


@router.get("/operations")
async def get_operations_insights(
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Operations insights -- issues + deployment summary."""
    # Issues summary
    issues = (
        supabase.table("issues")
        .select("severity, status")
        .eq("project_id", project_id)
        .execute()
    )
    issue_data = issues.data or []
    issue_summary = {
        "critical_open": len([i for i in issue_data if i["severity"] == "critical" and i["status"] != "resolved"]),
        "warning_open": len([i for i in issue_data if i["severity"] == "warning" and i["status"] != "resolved"]),
        "resolved": len([i for i in issue_data if i["status"] == "resolved"]),
        "total": len(issue_data),
    }

    # Recent deployments
    deploys = (
        supabase.table("deployment_logs")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )
    deploy_data = deploys.data or []
    deploy_summary = {
        "total": len(deploy_data),
        "success": len([d for d in deploy_data if d["status"] == "ready"]),
        "failed": len([d for d in deploy_data if d["status"] == "error"]),
        "success_rate": round(
            len([d for d in deploy_data if d["status"] == "ready"]) / max(len(deploy_data), 1) * 100
        ),
    }

    return {
        "issues": issue_summary,
        "deployments": deploy_summary,
        "recent_deployments": deploy_data[:5],
        "recent_issues": issue_data[:5],
    }
