"""fal.ai 영상 생성 webhook -- scene 완료 콜백.

기획서 §7.2 (webhook 등록 후 request_id 즉시 리턴, 결과는 콜백으로).

흐름:
- fal_ai.verify_webhook 으로 HMAC 검증 (secret 미설정 시 dev skip)
- payload 의 request_id -> video_scenes row correlate (fal_request_id)
- 결과 영상 다운로드 -> R2 업로드 (미설정 시 skip)
- media_assets row 생성 + video_scenes 상태 갱신 (ready / failed)

main.py 에 등록 필요 (사용자 직접):
    from app.api.routes.fal_webhook import router as fal_webhook_router
    app.include_router(fal_webhook_router, prefix="/api")
"""

import tempfile

import httpx
from fastapi import APIRouter, Request

from app.core.config import settings
from app.core.supabase import supabase, safe_maybe_single
from app.integrations import fal_ai

router = APIRouter(prefix="/webhooks", tags=["fal-webhook"])


def _extract_video_url(payload: dict) -> str | None:
    """fal webhook payload 에서 video URL 추출 (모델별 스키마 흡수)."""
    body = payload.get("payload") if isinstance(payload.get("payload"), dict) else payload
    video = body.get("video")
    if isinstance(video, dict) and video.get("url"):
        return video["url"]
    if isinstance(video, str):
        return video
    videos = body.get("videos")
    if isinstance(videos, list) and videos:
        first = videos[0]
        if isinstance(first, dict):
            return first.get("url")
        if isinstance(first, str):
            return first
    return None


@router.post("/fal")
async def fal_webhook(request: Request):
    """fal.ai 영상 생성 완료 콜백."""
    body = await request.body()
    signature = request.headers.get("x-fal-signature", "") or request.headers.get("x-webhook-signature", "")

    if not fal_ai.verify_webhook(body, signature):
        return {"ok": False, "error": "invalid signature"}

    payload = await request.json()
    request_id = payload.get("request_id") or payload.get("requestId")
    if not request_id:
        return {"ok": True, "skipped": "no request_id"}

    scene = safe_maybe_single(
        supabase.table("video_scenes").select("*").eq("fal_request_id", request_id)
    )
    if not scene:
        return {"ok": True, "skipped": "no matching scene"}

    status = (payload.get("status") or "").upper()
    if status in ("ERROR", "FAILED"):
        supabase.table("video_scenes").update({"status": "failed"}).eq("id", scene["id"]).execute()
        return {"ok": True, "scene": scene["id"], "status": "failed"}

    video_url = _extract_video_url(payload)
    if not video_url:
        return {"ok": True, "skipped": "no video url in payload"}

    # 결과 영상 다운로드
    local_path = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False).name
    try:
        async with httpx.AsyncClient(timeout=300) as client:
            async with client.stream("GET", video_url) as resp:
                resp.raise_for_status()
                with open(local_path, "wb") as out:
                    async for chunk in resp.aiter_bytes():
                        out.write(chunk)
    except Exception as e:
        supabase.table("video_scenes").update({"status": "failed"}).eq("id", scene["id"]).execute()
        return {"ok": False, "error": f"download failed: {e}"}

    # video_project + project 컨텍스트 조회 (media_assets 에 필요)
    vp = safe_maybe_single(
        supabase.table("video_projects").select("project_id, user_id, model")
        .eq("id", scene["video_project_id"])
    ) or {}

    storage_url = local_path
    if settings.r2_account_id and settings.r2_access_key_id and settings.r2_secret_access_key:
        try:
            from app.integrations import cloudflare_r2
            key = f"videos/{vp.get('project_id', 'unknown')}/scenes/{scene['id']}.mp4"
            storage_url = cloudflare_r2.upload_file(key, local_path, content_type="video/mp4")
        except Exception:
            storage_url = local_path

    asset_id = None
    if vp.get("project_id") and vp.get("user_id"):
        try:
            res = supabase.table("media_assets").insert({
                "project_id": vp["project_id"],
                "user_id": vp["user_id"],
                "asset_type": "video",
                "source": "ai_generated",
                "ai_model": vp.get("model") or "kling-3.0",
                "prompt": scene.get("prompt"),
                "storage_url": storage_url,
                "duration_seconds": scene.get("duration_seconds"),
                "generation_metadata": {"scene_index": scene.get("scene_index"), "via": "webhook"},
            }).execute()
            asset_id = res.data[0]["id"]
        except Exception:
            asset_id = None

    update = {"status": "ready"}
    if asset_id:
        update["asset_id"] = asset_id
    supabase.table("video_scenes").update(update).eq("id", scene["id"]).execute()

    return {"ok": True, "scene": scene["id"], "asset_id": asset_id, "status": "ready"}
