"""AMP graph runner — LangGraph 실행 + workflow_run DB 기록 + HITL resume.

기획서 §3 + §6.

run_graph(): 그래프 시작 (interrupt 시 paused 상태로 반환)
resume_graph(): 승인/거절 후 재개
"""

import uuid
from datetime import datetime, timezone

from app.agents.graph import get_graph
from app.agents.graph_state import build_thread_id
from app.core.supabase import supabase


async def run_graph(
    graph_name: str,
    project_id: str,
    user_id: str,
    trigger: dict,
    event_id: str | None = None,
) -> dict:
    """Start a graph run. Returns {status, workflow_run_id, thread_id, result}.

    status: 'completed' | 'paused_awaiting_approval' | 'failed'
    """
    event_id = event_id or str(uuid.uuid4())[:8]
    thread_id = build_thread_id(project_id, graph_name, event_id)

    # workflow_run 기록
    run_row = supabase.table("workflow_runs").insert({
        "project_id": project_id,
        "graph_name": graph_name,
        "thread_id": thread_id,
        "status": "running",
        "current_node": "strategy",
    }).execute()
    workflow_run_id = run_row.data[0]["id"]

    trigger = {**trigger, "workflow_run_id": workflow_run_id}

    try:
        graph = await get_graph(graph_name, with_checkpointer=True)
        config = {"configurable": {"thread_id": thread_id}}
        initial = {
            "project_id": project_id,
            "user_id": user_id,
            "trigger": trigger,
            "context": {},
            "iteration": 0,
        }
        result = await graph.ainvoke(initial, config)

        # interrupt 됐는지 확인
        snapshot = await graph.aget_state(config)
        if snapshot.next:  # 다음 노드 대기 = interrupt
            paused_node = snapshot.next[0]
            await _create_approval_if_needed(
                project_id, user_id, workflow_run_id, thread_id, snapshot.values
            )
            supabase.table("workflow_runs").update({
                "status": "paused_awaiting_approval",
                "current_node": paused_node,
                "state_snapshot": _safe_snapshot(snapshot.values),
            }).eq("id", workflow_run_id).execute()
            return {
                "status": "paused_awaiting_approval",
                "workflow_run_id": workflow_run_id,
                "thread_id": thread_id,
                "paused_at": paused_node,
                "drafts": snapshot.values.get("drafts", []),
            }

        # 완료
        supabase.table("workflow_runs").update({
            "status": "completed",
            "current_node": result.get("current_node"),
            "cost_usd": result.get("cost_usd", 0),
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", workflow_run_id).execute()
        return {
            "status": "completed",
            "workflow_run_id": workflow_run_id,
            "thread_id": thread_id,
            "publish_results": result.get("publish_results", []),
            "cost_usd": result.get("cost_usd", 0),
        }

    except Exception as e:
        supabase.table("workflow_runs").update({
            "status": "failed",
            "error_message": str(e)[:500],
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", workflow_run_id).execute()
        return {"status": "failed", "workflow_run_id": workflow_run_id, "error": str(e)[:300]}


async def resume_graph(thread_id: str, graph_name: str, decision: str) -> dict:
    """Resume a paused graph after human approval.

    decision: 'approved' | 'rejected'
    """
    run = (
        supabase.table("workflow_runs")
        .select("*")
        .eq("thread_id", thread_id)
        .single()
        .execute()
    )
    if not run.data:
        return {"status": "error", "error": "workflow_run not found"}
    workflow_run_id = run.data["id"]

    try:
        graph = await get_graph(graph_name, with_checkpointer=True)
        config = {"configurable": {"thread_id": thread_id}}

        await graph.aupdate_state(config, {"approval_status": decision})
        result = await graph.ainvoke(None, config)

        supabase.table("workflow_runs").update({
            "status": "completed",
            "current_node": result.get("current_node"),
            "cost_usd": run.data.get("cost_usd", 0) + result.get("cost_usd", 0),
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", workflow_run_id).execute()

        return {
            "status": "completed",
            "workflow_run_id": workflow_run_id,
            "decision": decision,
            "publish_results": result.get("publish_results", []),
        }
    except Exception as e:
        supabase.table("workflow_runs").update({
            "status": "failed", "error_message": str(e)[:500],
        }).eq("id", workflow_run_id).execute()
        return {"status": "failed", "error": str(e)[:300]}


async def _create_approval_if_needed(project_id, user_id, workflow_run_id, thread_id, values):
    """paused 시 approval_queue 항목 생성."""
    try:
        supabase.table("approval_queue").insert({
            "project_id": project_id,
            "user_id": user_id,
            "item_type": "content_draft",
            "item_id": workflow_run_id,
            "workflow_run_id": workflow_run_id,
            "thread_id": thread_id,
            "priority": "normal",
            "context": {
                "drafts": values.get("drafts", []),
                "risk": values.get("risk", {}),
                "strategy": values.get("strategy", {}),
            },
            "ai_recommendation": "review",
            "status": "pending",
        }).execute()
    except Exception:
        pass


def _safe_snapshot(values: dict) -> dict:
    """state snapshot에서 직렬화 가능한 것만."""
    out = {}
    for k in ("strategy", "drafts", "risk", "publish_results", "requires_approval"):
        if k in values:
            out[k] = values[k]
    return out
