"""Insights APIs -- marketing metrics aggregation + operations overview."""

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.supabase import supabase

router = APIRouter(prefix="/projects/{project_id}/insights", tags=["insights"])


@router.get("/marketing")
async def get_marketing_insights(
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Marketing insights -- aggregated SNS metrics by channel and time."""
    # Get latest metrics snapshots
    metrics = (
        supabase.table("sns_metrics_snapshots")
        .select("*, promotion_posts!inner(platform)")
        .eq("project_id", project_id)
        .order("snapshot_at", desc=True)
        .limit(100)
        .execute()
    )

    # Get promotion posts summary
    posts = (
        supabase.table("promotion_posts")
        .select("platform, status")
        .eq("project_id", project_id)
        .execute()
    )

    # Aggregate by platform
    by_platform: dict[str, dict] = {}
    for m in metrics.data or []:
        platform = m.get("promotion_posts", {}).get("platform", "unknown")
        if platform not in by_platform:
            by_platform[platform] = {
                "impressions": 0, "clicks": 0, "likes": 0,
                "replies": 0, "reposts": 0, "views": 0,
            }
        bp = by_platform[platform]
        bp["impressions"] += m.get("impressions", 0)
        bp["clicks"] += m.get("url_clicks", 0)
        bp["likes"] += m.get("likes", 0)
        bp["replies"] += m.get("replies", 0)
        bp["reposts"] += m.get("reposts", 0)
        bp["views"] += m.get("views", 0)

    # Post counts by status
    post_counts = {"total": 0, "published": 0, "scheduled": 0, "draft": 0}
    for p in posts.data or []:
        post_counts["total"] += 1
        s = p.get("status", "draft")
        if s in post_counts:
            post_counts[s] += 1

    # Total metrics
    totals = {
        "impressions": sum(bp.get("impressions", 0) for bp in by_platform.values()),
        "clicks": sum(bp.get("clicks", 0) for bp in by_platform.values()),
        "likes": sum(bp.get("likes", 0) for bp in by_platform.values()),
    }
    totals["ctr"] = round(totals["clicks"] / max(totals["impressions"], 1) * 100, 1)

    return {
        "totals": totals,
        "by_platform": by_platform,
        "post_counts": post_counts,
        "recent_metrics": (metrics.data or [])[:30],
    }


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
