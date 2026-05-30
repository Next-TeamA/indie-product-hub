"""Strategy Agent node.

기획서 §4.2 — 무엇을 어디에 언제 발행할지 결정.

PR1 스켈레톤: trigger payload만으로 minimal decision. Wave 2에서 LLM 통합.
"""

from app.agents.graph_state import AMPState


async def strategy_node(state: AMPState) -> dict:
    """Decide should_publish, channels, format based on trigger event."""
    trigger = state.get("trigger", {})
    trigger_type = trigger.get("type", "")

    # PR1: Minimal rule-based decision (real LLM call comes in Wave 2)
    should_publish = False
    channels: list[str] = []
    format_ = "single"
    image_needed = False
    video_needed = False

    if trigger_type == "github.push":
        commits = trigger.get("payload", {}).get("commits", [])
        major = any(
            (c.get("message") or "").startswith(("feat:", "fix:", "release:", "launch:"))
            or len(c.get("modified", []) + c.get("added", [])) >= 3
            for c in commits
        )
        if major:
            should_publish = True
            channels = ["x", "threads"]
            image_needed = True

    elif trigger_type == "scheduled.weekly_summary":
        should_publish = True
        channels = ["youtube", "instagram", "tiktok"]
        format_ = "video"
        video_needed = True

    elif trigger_type == "mention":
        should_publish = True
        channels = [trigger.get("payload", {}).get("platform", "threads")]
        format_ = "reply"

    return {
        "strategy": {
            "should_publish": should_publish,
            "channels": channels,
            "format": format_,
            "image_needed": image_needed,
            "video_needed": video_needed,
            "reasoning": f"Auto-decision from {trigger_type} (Wave 2: LLM upgrade)",
        },
        "current_node": "strategy",
        "tier_used": {"strategy": "rule"},
        "cost_usd": 0.0,
    }
