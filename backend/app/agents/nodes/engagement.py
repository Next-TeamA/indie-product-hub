"""Engagement Agent node.

기획서 §4.4 -- 멘션/DM/댓글에 대한 답글 strategy.

흐름:
- trigger.payload.interaction_id 가 있으면 해당 interaction row 로드
- 없으면 최근 reply_status='pending' interaction 한 개 자동 선택
- 둘 다 없으면 처리할 게 없으니 should_publish=false 로 끝
- 분류는 content node에서 LLM 호출하므로 여기는 컨텍스트 적재만
"""

from app.agents.graph_state import AMPState
from app.core.supabase import safe_maybe_single, supabase


async def engagement_node(state: AMPState) -> dict:
    project_id = state.get("project_id")
    payload = state.get("trigger", {}).get("payload") or {}

    interaction = await _resolve_interaction(project_id, payload)

    if not interaction:
        return {
            "current_node": "engagement",
            "tier_used": {"engagement": "skipped"},
            "cost_usd": 0.0,
            "engagement_context": None,
            "strategy": {
                "should_publish": False,
                "channels": [],
                "format": "reply",
                "topic": "",
                "tone_hint": None,
                "image_needed": False,
                "video_needed": False,
                "reasoning": "처리할 mention/interaction이 없습니다 (payload.interaction_id 미지정 + pending 인터랙션 없음).",
            },
        }

    platform = interaction.get("platform") or "threads"
    return {
        "current_node": "engagement",
        "tier_used": {"engagement": "fetch"},
        "cost_usd": 0.0,
        "engagement_context": {
            "interaction_id": interaction.get("id"),
            "platform": platform,
            "interaction_type": interaction.get("interaction_type"),
            "sender": interaction.get("sender_username"),
            "content": interaction.get("content"),
            "external_id": interaction.get("external_id"),
            "parent_post_id": interaction.get("parent_post_id"),
        },
        "strategy": {
            "should_publish": True,
            "channels": [platform],
            "format": "reply",
            "topic": (interaction.get("content") or "")[:200],
            "tone_hint": "답글 -- 짧고 진심 있게, 자연스럽게. 광고 톤 금지.",
            "image_needed": False,
            "video_needed": False,
            "reasoning": f"Reply to {platform} {interaction.get('interaction_type')} from @{interaction.get('sender_username')}",
        },
    }


async def _resolve_interaction(project_id: str | None, payload: dict) -> dict | None:
    """interaction_id 지정 시 그 row, 아니면 최근 pending 1개."""
    if not project_id:
        return None

    interaction_id = payload.get("interaction_id")
    if interaction_id:
        row = safe_maybe_single(
            supabase.table("interactions").select("*").eq("id", interaction_id).eq("project_id", project_id)
        )
        if row:
            return row

    # fallback: 가장 최근 pending interaction
    try:
        rows = (
            supabase.table("interactions")
            .select("*")
            .eq("project_id", project_id)
            .eq("reply_status", "pending")
            .order("detected_at", desc=True)
            .limit(1)
            .execute()
            .data
        ) or []
    except Exception:
        rows = []
    return rows[0] if rows else None
