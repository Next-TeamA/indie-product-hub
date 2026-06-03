"""Asset Generation Agent node.

기획서 §4.5 -- 이미지/영상/오디오 자동 생성.

이미지: fal.ai Flux Pro 동기 호출 (~5-10초). 결과 URL을 media_assets에
저장하고 drafts 각각의 image_url에 첨부 -> publish 단계에서 X/Threads에
첨부됨.

영상: strategy.video_needed 면 video_projects row(status=queued) 생성 후
Celery 태스크 enqueue. redis 미설정이면 inline 실행(blocking) 으로 fallback.
"""

from app.agents.graph_state import AMPState


async def asset_gen_node(state: AMPState) -> dict:
    strategy = state.get("strategy") or {}
    project_id = state.get("project_id")
    user_id = state.get("user_id")
    drafts = state.get("drafts") or []

    assets: list[dict] = []
    extra_cost = 0.0

    # 이미지: 실제 생성 (Flux Pro)
    if strategy.get("image_needed") and project_id and user_id:
        img_asset = await _generate_image(state, strategy, project_id, user_id, drafts)
        assets.append(img_asset)
        extra_cost += float(img_asset.get("cost_usd") or 0.0)
        # drafts 각각에 image_url 첨부 (X/Threads 첨부용)
        if img_asset.get("url"):
            for d in drafts:
                d.setdefault("images", []).append(img_asset["url"])

    # 영상: video_projects row 생성 + Celery enqueue (또는 inline)
    if strategy.get("video_needed") and project_id and user_id:
        v_asset = await _enqueue_video(state, strategy, project_id, user_id)
        assets.append(v_asset)
        extra_cost += float(v_asset.get("cost_usd") or 0.0)

    return {
        "assets": assets,
        "drafts": drafts,  # image_url 첨부된 drafts 반영
        "current_node": "asset_gen",
        "tier_used": {"asset_gen": "fal+video_pipeline"},
        "cost_usd": extra_cost,
    }


# ============================================================
# Image (Flux Pro, sync)
# ============================================================

async def _generate_image(
    state: AMPState, strategy: dict, project_id: str, user_id: str, drafts: list[dict],
) -> dict:
    from app.integrations import fal_ai
    from app.core.supabase import supabase

    ctx = state.get("context") or {}
    project = ctx.get("project") or {}
    topic = strategy.get("topic") or ""
    tone = strategy.get("tone_hint") or ""

    # prompt: project name + topic + tone, flux가 잘 따라가게 영어 키워드 섞기
    first_draft = drafts[0].get("content", "") if drafts else ""
    prompt_parts = [
        project.get("name", "indie SaaS product"),
        topic,
        tone,
        first_draft[:200],
        "marketing graphic, clean, modern, high quality, social media post",
    ]
    prompt = ". ".join([p for p in prompt_parts if p])[:900]

    # 채널 첫 번째 보고 비율 결정 (instagram=1:1, 그 외 16:9)
    channels = strategy.get("channels") or []
    aspect = "1:1" if "instagram" in channels else "16:9"

    try:
        result = await fal_ai.generate_image(
            prompt=prompt,
            model="flux-pro",
            aspect_ratio=aspect,
        )
    except Exception as e:
        return {
            "type": "image", "url": "", "asset_id": "", "cost_usd": 0.0,
            "note": f"image generation failed: {e}",
        }

    images = result.get("images") or []
    if not images:
        return {
            "type": "image", "url": "", "asset_id": "", "cost_usd": 0.0,
            "note": "fal returned no images",
        }

    img_url = images[0].get("url") or ""
    width = images[0].get("width")
    height = images[0].get("height")
    cost = 0.05  # flux-pro per image (MODEL_REGISTRY cost_per_image)

    # media_assets 저장
    asset_id = ""
    try:
        row = supabase.table("media_assets").insert({
            "project_id": project_id,
            "user_id": user_id,
            "asset_type": "image",
            "source": "ai_generated",
            "ai_model": "flux-pro",
            "prompt": prompt,
            "storage_url": img_url,
            "width": width,
            "height": height,
            "cost_usd": cost,
            "generation_metadata": {"aspect_ratio": aspect, "workflow_run_id": state.get("workflow_run_id")},
        }).execute()
        asset_id = row.data[0]["id"]
    except Exception:
        pass

    # cost_ledger
    try:
        supabase.table("cost_ledger").insert({
            "project_id": project_id,
            "user_id": user_id,
            "service": "fal",
            "operation": "image:flux-pro",
            "cost_usd": cost,
            "units_used": 1,
            "related_asset_id": asset_id or None,
            "workflow_run_id": state.get("workflow_run_id"),
        }).execute()
    except Exception:
        pass

    return {
        "type": "image",
        "url": img_url,
        "asset_id": asset_id,
        "cost_usd": cost,
        "note": "flux-pro",
    }


# ============================================================
# Video (Celery or inline)
# ============================================================


async def _enqueue_video(
    state: AMPState, strategy: dict, project_id: str, user_id: str,
) -> dict:
    """video_projects row 생성 후 생성 작업 enqueue. asset 참조 dict 반환."""
    from app.core.supabase import supabase

    ctx = state.get("context") or {}
    project = ctx.get("project") or {}
    drafts = state.get("drafts") or []

    title = (project.get("name") or "Launch video")[:120]
    script_prompt = strategy.get("video_prompt") or (
        drafts[0].get("content") if drafts else ""
    ) or "Short product launch teaser highlighting the key value proposition."
    total_duration = int(strategy.get("video_duration") or 30)
    model = strategy.get("video_model") or "kling-3.0"

    try:
        row = supabase.table("video_projects").insert({
            "project_id": project_id,
            "user_id": user_id,
            "title": title,
            "script": {"prompt": script_prompt},
            "total_duration_seconds": total_duration,
            "model": model,
            "status": "queued",
            "workflow_run_id": state.get("workflow_run_id"),
        }).execute()
        video_project_id = row.data[0]["id"]
    except Exception as e:
        return {
            "type": "video", "url": "", "asset_id": "", "cost_usd": 0.0,
            "note": f"video_project create failed: {e}",
        }

    # Celery enqueue (redis 설정 시) 또는 inline 실행
    enqueued = False
    try:
        from app.workers.celery_app import redis_configured
        if redis_configured():
            from app.workers.celery_tasks.video_generation import generate_video_task
            generate_video_task.delay(video_project_id)
            enqueued = True
    except Exception:
        enqueued = False

    if not enqueued:
        # redis 없음 -> inline 실행 (blocking, dev/단일 인스턴스용)
        try:
            from app.services import video_pipeline
            result = await video_pipeline.generate_video(video_project_id)
            return {
                "type": "video",
                "url": result.get("asset_url") or "",
                "asset_id": result.get("asset_id") or "",
                "video_project_id": video_project_id,
                "cost_usd": float(result.get("total_cost_usd") or 0.0),
                "status": result.get("status"),
                "note": "inline (no redis)",
            }
        except Exception as e:
            return {
                "type": "video", "url": "", "asset_id": "",
                "video_project_id": video_project_id, "cost_usd": 0.0,
                "note": f"inline generation failed: {e}",
            }

    return {
        "type": "video",
        "url": "",
        "asset_id": "",
        "video_project_id": video_project_id,
        "cost_usd": 0.0,
        "status": "queued",
        "note": "Celery enqueued",
    }
