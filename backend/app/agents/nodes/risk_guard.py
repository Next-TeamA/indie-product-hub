"""Risk Guard Agent node.

기획서 §4.6 + §10 — 5단계 안전 가드.

PR1: 모든 draft를 일단 통과시키되 X 발행 + 첫 LinkedIn은 강제 승인.
Wave 3에서 실제 5단계 가드 (moderation/dedup/rate_limit/cost/shadowban) 구현.
"""

from app.agents.graph_state import AMPState


# 강제 휴먼 게이트 채널 (사용자 설정 무관)
FORCED_HUMAN_CHANNELS = {"x", "linkedin"}


async def risk_guard_node(state: AMPState) -> dict:
    drafts = state.get("drafts") or []
    channels = {d.get("channel") for d in drafts}

    # 강제 휴먼 게이트
    forced_approval = bool(channels & FORCED_HUMAN_CHANNELS)

    # PR1: minimal — Wave 3에서 실제 가드 구현
    return {
        "risk": {
            "approved": True,
            "blocking_reasons": [],
            "warnings": [
                "Wave 3: full guard chain (moderation/dedup/rate/cost/shadowban) pending"
            ],
            "score": 0.5,
        },
        "requires_approval": forced_approval,
        "current_node": "risk_guard",
        "cost_usd": 0.0,
    }
