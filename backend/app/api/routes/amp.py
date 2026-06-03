"""AMP (Autonomous Marketing Platform) routes — LangGraph 트리거 + 승인.

기획서 §12 + §13.

- POST /projects/{id}/amp/run         : 그래프 수동 실행
- GET  /projects/{id}/amp/runs        : workflow_runs 목록
- GET  /projects/{id}/amp/approvals   : 승인 대기 목록
- POST /projects/{id}/amp/approvals/{approval_id}/decide : 승인/거절 + resume
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.agents.runner import resume_graph, run_graph
from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.exceptions import NotFoundError, ValidationError
from app.core.supabase import safe_maybe_single, supabase

router = APIRouter(prefix="/projects/{project_id}/amp", tags=["amp"])


class RunInput(BaseModel):
    graph: str = "content_creation"  # content_creation | engagement | video_production
    trigger_type: str = "manual"     # manual | github.push | scheduled.weekly_summary
    payload: dict = {}


@router.post("/run")
async def run_amp(
    project_id: str,
    body: RunInput,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Manually trigger an AMP graph. Returns run status (may pause for approval)."""
    if body.graph not in ("content_creation", "engagement", "video_production"):
        raise ValidationError(f"Unknown graph: {body.graph}")

    payload = dict(body.payload or {})

    # video_production 그래프는 영상이 목적이므로 video_needed=true 강제.
    # 채널/format도 비어 있으면 영상 친화적 기본값 주입 (strategy 노드에서
    # explicit 분기로 인정되도록).
    if body.graph == "video_production":
        payload.setdefault("video_needed", True)
        payload.setdefault("format", "video")
        if not payload.get("channels"):
            payload["channels"] = ["youtube", "instagram", "tiktok"]
        if not payload.get("topic"):
            # brief 또는 title 어느 쪽이든 topic 으로 승격
            payload["topic"] = (
                payload.get("brief") or payload.get("title") or "Product video"
            )

    result = await run_graph(
        graph_name=body.graph,
        project_id=project_id,
        user_id=user["id"],
        trigger={"type": body.trigger_type, "payload": payload},
    )
    return result


@router.get("/runs")
async def list_runs(
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    result = (
        supabase.table("workflow_runs")
        .select("*")
        .eq("project_id", project_id)
        .order("started_at", desc=True)
        .limit(30)
        .execute()
    )
    return result.data


@router.get("/runs/{run_id}")
async def get_run(
    project_id: str,
    run_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Single workflow_run with its approvals."""
    run = safe_maybe_single(
        supabase.table("workflow_runs")
        .select("*")
        .eq("id", run_id)
        .eq("project_id", project_id)
    )
    if not run:
        raise NotFoundError("WorkflowRun", run_id)

    approvals = (
        supabase.table("approval_queue")
        .select("*")
        .eq("workflow_run_id", run_id)
        .order("created_at", desc=True)
        .execute()
        .data
    )
    return {"run": run, "approvals": approvals}


@router.get("/approvals")
async def list_approvals(
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    result = (
        supabase.table("approval_queue")
        .select("*")
        .eq("project_id", project_id)
        .eq("status", "pending")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


class DecideInput(BaseModel):
    decision: str  # 'approved' | 'rejected'


@router.post("/approvals/{approval_id}/decide")
async def decide_approval(
    project_id: str,
    approval_id: str,
    body: DecideInput,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    if body.decision not in ("approved", "rejected"):
        raise ValidationError("decision must be 'approved' or 'rejected'")

    approval = safe_maybe_single(
        supabase.table("approval_queue")
        .select("*")
        .eq("id", approval_id)
        .eq("project_id", project_id)
    )
    if not approval:
        raise NotFoundError("Approval", approval_id)

    # 그래프 resume
    run = safe_maybe_single(
        supabase.table("workflow_runs")
        .select("graph_name, thread_id")
        .eq("id", approval["workflow_run_id"])
    )
    resume_result = {"status": "skipped", "reason": "no workflow run"}
    if run:
        resume_result = await resume_graph(
            thread_id=run["thread_id"],
            graph_name=run["graph_name"],
            decision=body.decision,
        )

    # approval_queue 업데이트
    from datetime import datetime, timezone
    supabase.table("approval_queue").update({
        "status": body.decision,
        "decided_at": datetime.now(timezone.utc).isoformat(),
        "decided_by": user["id"],
    }).eq("id", approval_id).execute()

    return {"decision": body.decision, "resume": resume_result}
