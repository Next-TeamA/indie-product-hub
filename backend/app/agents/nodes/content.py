"""Content Agent node.

기획서 §4.3 — 사용자 voice 매칭 멀티 채널 카피 작성.

PR1 스켈레톤: 빈 draft 반환. Wave 2에서 voice RAG + Claude Sonnet 통합.
"""

from app.agents.graph_state import AMPState


async def content_node(state: AMPState) -> dict:
    strategy = state.get("strategy") or {}
    channels = strategy.get("channels", [])
    trigger = state.get("trigger", {})

    # PR1: 비어있는 draft placeholder (실제 LLM 호출은 Wave 2)
    drafts = []
    for ch in channels:
        drafts.append({
            "channel": ch,
            "hook": "TODO: Wave 2 will call Claude Sonnet here",
            "content": f"Auto-generated content placeholder for {ch} from trigger {trigger.get('type')}",
            "hashtags": [],
            "voice_match_score": 0.0,
            "lang": "ko",
            "format": strategy.get("format", "single"),
        })

    return {
        "drafts": drafts,
        "current_node": "content",
        "tier_used": {"content": "placeholder"},
        "cost_usd": 0.0,
    }
