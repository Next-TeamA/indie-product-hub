"""Engagement Agent node.

기획서 §4.4 — 멘션/DM/댓글 분류 + 응답 필요 판단.

PR1 스켈레톤. Wave 6에서 분류 LLM + 답글 생성 통합.
"""

from app.agents.graph_state import AMPState


async def engagement_node(state: AMPState) -> dict:
    payload = state.get("trigger", {}).get("payload", {})

    return {
        "current_node": "engagement",
        "tier_used": {"engagement": "placeholder"},
        "cost_usd": 0.0,
        # Wave 6에서:
        # - classify (spam/question/praise/criticism/opportunity)
        # - should_respond (휴먼-라이크 80% rate)
        # - delay 계산
    }
