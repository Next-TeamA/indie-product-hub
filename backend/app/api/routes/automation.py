"""Automation endpoints -- smart features that connect services together."""

from fastapi import APIRouter, Depends, BackgroundTasks, Request

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.rate_limit import limiter
from app.services.automation import (
    analyze_optimal_posting_time,
    generate_weekly_report,
    sync_github_issues,
)

router = APIRouter(prefix="/projects/{project_id}/automation", tags=["automation"])


@router.get("/optimal-time")
async def get_optimal_posting_time(
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Analyze past posts to recommend the best time to publish."""
    return await analyze_optimal_posting_time(project_id, user["id"])


@router.post("/weekly-report")
@limiter.limit("3/hour")
async def create_weekly_report(
    request: Request,
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Generate a comprehensive weekly report using AI."""
    return await generate_weekly_report(project_id)


@router.post("/sync-github-issues")
@limiter.limit("5/hour")
async def trigger_github_sync(
    request: Request,
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Sync open issues from connected GitHub repository."""
    return await sync_github_issues(project_id, user["id"])
