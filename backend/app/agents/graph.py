"""LangGraph StateGraph builders for AMP.

기획서 §3 + §부록 I.

3개 메인 그래프:
- content_creation: 이벤트 → 콘텐츠 → 발행
- engagement: 멘션 → 답글 초안 → 발행
- video_production: 스크립트 → 영상 생성 → 발행

각 그래프는 동일 6개 노드 (strategy/content/engagement/asset_gen/risk_guard/publish/performance/human_gate)
를 다르게 조합. interrupt_before로 human_gate에서 일시정지.

PR1 시점에는 graph **빌드**만 제공 (각 노드 본격 구현은 Wave 2-5).
이미 import만 해도 LangGraph 통신 가능 여부 검증 가능.
"""

from typing import Literal

from langgraph.graph import END, StateGraph

from app.agents.graph_state import AMPState
from app.agents.nodes import (
    asset_gen_node,
    content_node,
    engagement_node,
    human_gate_node,
    performance_node,
    publish_node,
    risk_guard_node,
    strategy_node,
)


# ============================================================
# Conditional Edge Functions
# ============================================================

def after_strategy(state: AMPState) -> Literal["content", "__end__"]:
    if not state.get("strategy", {}).get("should_publish"):
        return "__end__"
    return "content"


def after_content(state: AMPState) -> Literal["asset_gen", "risk_guard"]:
    strat = state.get("strategy") or {}
    if strat.get("image_needed") or strat.get("video_needed"):
        return "asset_gen"
    return "risk_guard"


def after_risk(state: AMPState) -> Literal["human_gate", "publish"]:
    if state.get("requires_approval"):
        return "human_gate"
    return "publish"


def after_human_gate(state: AMPState) -> Literal["publish", "__end__"]:
    if state.get("approval_status") == "approved":
        return "publish"
    return "__end__"


# ============================================================
# Graph builders
# ============================================================

def build_content_creation_graph(checkpointer=None):
    """이벤트 → 콘텐츠 → 발행 (Flow A)."""
    g = StateGraph(AMPState)

    g.add_node("strategy", strategy_node)
    g.add_node("content", content_node)
    g.add_node("asset_gen", asset_gen_node)
    g.add_node("risk_guard", risk_guard_node)
    g.add_node("human_gate", human_gate_node)
    g.add_node("publish", publish_node)
    g.add_node("performance", performance_node)

    g.set_entry_point("strategy")
    g.add_conditional_edges("strategy", after_strategy, {"content": "content", "__end__": END})
    g.add_conditional_edges("content", after_content, {"asset_gen": "asset_gen", "risk_guard": "risk_guard"})
    g.add_edge("asset_gen", "risk_guard")
    g.add_conditional_edges("risk_guard", after_risk, {"human_gate": "human_gate", "publish": "publish"})
    g.add_conditional_edges("human_gate", after_human_gate, {"publish": "publish", "__end__": END})
    g.add_edge("publish", "performance")
    g.add_edge("performance", END)

    if checkpointer:
        return g.compile(checkpointer=checkpointer, interrupt_before=["human_gate"])
    return g.compile()


def build_engagement_graph(checkpointer=None):
    """멘션 → 답글 초안 → 발행 (Flow B)."""
    g = StateGraph(AMPState)

    g.add_node("engagement", engagement_node)
    g.add_node("content", content_node)
    g.add_node("risk_guard", risk_guard_node)
    g.add_node("human_gate", human_gate_node)
    g.add_node("publish", publish_node)

    g.set_entry_point("engagement")
    g.add_edge("engagement", "content")
    g.add_edge("content", "risk_guard")
    g.add_conditional_edges("risk_guard", after_risk, {"human_gate": "human_gate", "publish": "publish"})
    g.add_conditional_edges("human_gate", after_human_gate, {"publish": "publish", "__end__": END})
    g.add_edge("publish", END)

    if checkpointer:
        return g.compile(checkpointer=checkpointer, interrupt_before=["human_gate"])
    return g.compile()


def build_video_production_graph(checkpointer=None):
    """스크립트 → 영상 생성 → 발행 (Flow C)."""
    g = StateGraph(AMPState)

    g.add_node("strategy", strategy_node)
    g.add_node("content", content_node)          # 스크립트 작성
    g.add_node("asset_gen", asset_gen_node)      # 영상 파이프라인 트리거
    g.add_node("risk_guard", risk_guard_node)
    g.add_node("human_gate", human_gate_node)    # 영상 미리보기 승인
    g.add_node("publish", publish_node)          # YT + IG + TikTok 병렬
    g.add_node("performance", performance_node)

    g.set_entry_point("strategy")
    g.add_edge("strategy", "content")
    g.add_edge("content", "asset_gen")
    g.add_edge("asset_gen", "risk_guard")
    g.add_conditional_edges("risk_guard", after_risk, {"human_gate": "human_gate", "publish": "publish"})
    g.add_conditional_edges("human_gate", after_human_gate, {"publish": "publish", "__end__": END})
    g.add_edge("publish", "performance")
    g.add_edge("performance", END)

    if checkpointer:
        return g.compile(checkpointer=checkpointer, interrupt_before=["human_gate"])
    return g.compile()


# ============================================================
# Graph Registry
# ============================================================

GRAPH_BUILDERS = {
    "content_creation": build_content_creation_graph,
    "engagement": build_engagement_graph,
    "video_production": build_video_production_graph,
}


async def get_graph(graph_name: str, with_checkpointer: bool = True):
    """Fetch + compile a named graph. Caches by name."""
    if graph_name not in GRAPH_BUILDERS:
        raise ValueError(f"Unknown graph: {graph_name}")

    checkpointer = None
    if with_checkpointer:
        from app.agents.checkpointer import get_checkpointer
        checkpointer = await get_checkpointer()

    return GRAPH_BUILDERS[graph_name](checkpointer=checkpointer)
