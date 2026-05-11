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
    """홍보 인사이트 -- 채널별 성과, 주간 추이."""
    metrics = (
        supabase.table("promotion_metrics")
        .select("*")
        .eq("project_id", project_id)
        .order("recorded_at", desc=True)
        .limit(30)
        .execute()
    )
    return {"metrics": metrics.data}


@router.get("/operations")
async def get_operations_insights(
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """운영 인사이트 -- 이슈 요약."""
    issues = (
        supabase.table("issues")
        .select("severity, status")
        .eq("project_id", project_id)
        .execute()
    )

    data = issues.data or []
    summary = {
        "critical_open": len(
            [i for i in data if i["severity"] == "critical" and i["status"] != "resolved"]
        ),
        "warning_open": len(
            [i for i in data if i["severity"] == "warning" and i["status"] != "resolved"]
        ),
        "resolved": len([i for i in data if i["status"] == "resolved"]),
        "total": len(data),
    }
    return {"summary": summary, "issues": data}
