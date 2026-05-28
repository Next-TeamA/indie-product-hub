"""Asset Generation Agent node.

기획서 §4.5 — 이미지/영상/오디오 자동 생성 (Celery 위임).

PR1 스켈레톤. Wave 5에서 fal.ai + ElevenLabs + ffmpeg 통합.
"""

from app.agents.graph_state import AMPState


async def asset_gen_node(state: AMPState) -> dict:
    strategy = state.get("strategy") or {}

    assets: list[dict] = []
    if strategy.get("image_needed"):
        assets.append({
            "type": "image",
            "url": "",
            "asset_id": "",
            "cost_usd": 0.0,
            "note": "Wave 5: Flux Pro / Imagen / Puppeteer screenshot",
        })
    if strategy.get("video_needed"):
        assets.append({
            "type": "video",
            "url": "",
            "asset_id": "",
            "cost_usd": 0.0,
            "note": "Wave 5: fal.ai Kling 3.0 + ElevenLabs + Whisper + ffmpeg",
        })

    return {
        "assets": assets,
        "current_node": "asset_gen",
        "tier_used": {"asset_gen": "placeholder"},
        "cost_usd": 0.0,
    }
