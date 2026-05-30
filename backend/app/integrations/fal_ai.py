"""fal.ai API wrapper -- Kling / Veo / Sora / Flux 통합 게이트웨이.

용도 (기획서 §7 영상 파이프라인):
- Kling 3.0: 일일 발행용 영상 ($0.10/sec)
- Veo 3.1: 캠페인/런칭 영상 ($0.15/sec, 4K + 오디오)
- Sora 2: 시네마틱 hero 영상 ($0.75/sec)
- Flux Pro: 이미지 생성 ($0.05/image)

비동기 패턴: webhook 등록 후 request_id 즉시 리턴, 결과는 콜백으로.
"""

import hashlib
import hmac
from typing import Any

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalAPIError

FAL_BASE = "https://queue.fal.run/fal-ai"
FAL_DIRECT = "https://fal.run/fal-ai"

# 모델별 endpoint + 초당 비용 (USD)
MODEL_REGISTRY: dict[str, dict[str, Any]] = {
    "kling-3.0": {
        "endpoint": "kling-video/v2.1/standard/text-to-video",
        "cost_per_sec": 0.10,
        "supports_audio": False,
        "max_duration": 10,
    },
    "veo-3.1": {
        "endpoint": "veo/v3.1/text-to-video",
        "cost_per_sec": 0.15,
        "supports_audio": True,
        "max_duration": 8,
    },
    "sora-2": {
        "endpoint": "sora/v2/text-to-video",
        "cost_per_sec": 0.75,
        "supports_audio": True,
        "max_duration": 20,
    },
    "flux-pro": {
        "endpoint": "flux-pro/v1.1",
        "cost_per_image": 0.05,
    },
}


def _headers() -> dict[str, str]:
    if not settings.fal_api_key:
        raise ExternalAPIError("fal.ai", "FAL_API_KEY not configured")
    return {
        "Authorization": f"Key {settings.fal_api_key}",
        "Content-Type": "application/json",
    }


# ============================================================
# Video Generation (async, webhook-based)
# ============================================================

async def submit_video(
    model: str,
    prompt: str,
    duration_seconds: int = 5,
    aspect_ratio: str = "9:16",
    webhook_url: str | None = None,
    **kwargs: Any,
) -> str:
    """Submit video generation. Returns request_id immediately.

    Result arrives via webhook (set FAL_WEBHOOK_SECRET for HMAC verification)
    or can be polled via `get_status(request_id)`.
    """
    if model not in MODEL_REGISTRY:
        raise ExternalAPIError("fal.ai", f"Unknown model: {model}")

    cfg = MODEL_REGISTRY[model]
    if "endpoint" not in cfg or "cost_per_sec" not in cfg:
        raise ExternalAPIError("fal.ai", f"{model} is not a video model")
    if duration_seconds > cfg["max_duration"]:
        raise ExternalAPIError("fal.ai", f"{model} max duration is {cfg['max_duration']}s")

    payload: dict[str, Any] = {
        "prompt": prompt,
        "duration": str(duration_seconds),
        "aspect_ratio": aspect_ratio,
        **kwargs,
    }
    if webhook_url:
        payload["webhook_url"] = webhook_url

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            r = await client.post(
                f"{FAL_BASE}/{cfg['endpoint']}",
                headers=_headers(),
                json=payload,
            )
            r.raise_for_status()
            return r.json()["request_id"]
        except httpx.HTTPError as e:
            raise ExternalAPIError("fal.ai", f"Submit failed: {e}")


async def get_status(request_id: str, endpoint: str) -> dict:
    """Poll request status. Returns {status, ...}."""
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            r = await client.get(
                f"{FAL_BASE}/{endpoint}/requests/{request_id}/status",
                headers=_headers(),
            )
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError as e:
            raise ExternalAPIError("fal.ai", f"Status fetch failed: {e}")


async def get_result(request_id: str, endpoint: str) -> dict:
    """Fetch final result after status=COMPLETED."""
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            r = await client.get(
                f"{FAL_BASE}/{endpoint}/requests/{request_id}",
                headers=_headers(),
            )
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError as e:
            raise ExternalAPIError("fal.ai", f"Result fetch failed: {e}")


# ============================================================
# Image Generation (sync, fast)
# ============================================================

async def generate_image(
    prompt: str,
    model: str = "flux-pro",
    aspect_ratio: str = "1:1",
    **kwargs: Any,
) -> dict:
    """Synchronous image generation. Returns {images: [{url, width, height}]}."""
    cfg = MODEL_REGISTRY.get(model)
    if not cfg or "endpoint" not in cfg:
        raise ExternalAPIError("fal.ai", f"Unknown image model: {model}")

    payload = {"prompt": prompt, "aspect_ratio": aspect_ratio, **kwargs}

    async with httpx.AsyncClient(timeout=120) as client:
        try:
            r = await client.post(
                f"{FAL_DIRECT}/{cfg['endpoint']}",
                headers=_headers(),
                json=payload,
            )
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError as e:
            raise ExternalAPIError("fal.ai", f"Image generation failed: {e}")


# ============================================================
# Webhook Verification
# ============================================================

def verify_webhook(payload: bytes, signature: str) -> bool:
    """Verify fal.ai webhook HMAC signature."""
    if not settings.fal_webhook_secret:
        return True   # secret 미설정 시 skip (dev only)
    expected = hmac.new(
        settings.fal_webhook_secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
