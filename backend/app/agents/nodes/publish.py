"""Publish node — multi-channel parallel publishing.

기획서 §4 + §6.

PR1: 빈 placeholder. Wave 4-5에서 채널별 publisher 통합.
실제 발행은 기존 promotion.py:_do_publish를 호출하거나 신규 통합 클라이언트
(instagram_client, youtube_client, tiktok_client, linkedin_client) 사용.
"""

from app.agents.graph_state import AMPState


async def publish_node(state: AMPState) -> dict:
    drafts = state.get("drafts") or []
    results = []
    for d in drafts:
        results.append({
            "channel": d.get("channel"),
            "external_id": "",
            "status": "skipped",
            "note": "Wave 4-5: actual publisher integration",
        })

    return {
        "publish_results": results,
        "current_node": "publish",
        "cost_usd": 0.0,
    }
