"""Human-in-the-Loop gate node.

기획서 §부록 I.5.

LangGraph가 `interrupt_before=["human_gate"]`로 컴파일되므로 이 노드 진입
직전 그래프 일시정지. 외부 (UI/Slack)에서 승인 결정을 graph.update_state로
주입하면 이 노드가 실행되어 다음 노드로 진행.

PR1: state의 approval_status를 그대로 반환 (외부 주입 가정).
Wave 8에서 Slack/푸시 알림 통합.
"""

from app.agents.graph_state import AMPState


async def human_gate_node(state: AMPState) -> dict:
    # LangGraph가 interrupt 후 resume 시점에 도달
    # state["approval_status"]는 사용자 결정이 주입된 상태
    status = state.get("approval_status") or "pending"
    return {
        "approval_status": status,
        "current_node": "human_gate",
    }
