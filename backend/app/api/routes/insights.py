from fastapi import APIRouter, Depends
from app.core.auth import get_current_user
from app.core.supabase import supabase

router = APIRouter(prefix="/projects/{project_id}/insights", tags=["insights"])


@router.get("/marketing")
async def get_marketing_insights(
    project_id: str, user: dict = Depends(get_current_user)
):
    """홍보 인사이트 -- 채널별 성과, 주간 추이.

    TODO: SNS API 연동 후 실제 데이터로 교체.
    현재는 DB에서 promotion_metrics 테이블 조회.
    """
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
    project_id: str, user: dict = Depends(get_current_user)
):
    """운영 인사이트 -- 이슈 요약, 이상 감지.

    TODO: GitHub API 연동으로 배포 로그 분석, 에러 트래킹 연동.
    현재는 issues 테이블에서 집계.
    """
    issues = (
        supabase.table("issues")
        .select("severity, status")
        .eq("project_id", project_id)
        .execute()
    )

    data = issues.data or []
    summary = {
        "critical_open": len([i for i in data if i["severity"] == "critical" and i["status"] != "resolved"]),
        "warning_open": len([i for i in data if i["severity"] == "warning" and i["status"] != "resolved"]),
        "resolved": len([i for i in data if i["status"] == "resolved"]),
        "total": len(data),
    }
    return {"summary": summary, "issues": data}
