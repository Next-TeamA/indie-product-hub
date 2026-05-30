"""Asset Generation Agent node.

기획서 §4.5 -- 이미지/영상/오디오 자동 생성 (Celery 위임).

영상: strategy.video_needed 면 video_projects row(status=queued) 생성 후
Celery 태스크 enqueue. redis 미설정이면 inline 실행(blocking) 으로 fallback.
무거운 import(video_pipeline / celery)는 함수 안에서 lazy 로 끌어온다 -- 모듈
로드 시 cv2/open_clip 같은 선택 의존성이 끌려오지 않도록.
이미지는 PR1 placeholder 유지(Wave 5에서 Flux Pro 통합).
"""

from app.agents.graph_state import AMPState


async def asset_gen_node(state: AMPState) -> dict:
    strategy = state.get("strategy") or {}
    project_id = state.get("project_id")
    user_id = state.get("user_id")

    assets: list[dict] = []

    # 이미지: 기존 placeholder 유지
    if strategy.get("image_needed"):
        assets.append({
            "type": "image",
            "url": "",
            "asset_id": "",
            "cost_usd": 0.0,
            "note": "Wave 5: Flux Pro / Imagen / Puppeteer screenshot",
        })

    # 영상: video_projects row 생성 + Celery enqueue (또는 inline)
    if strategy.get("video_needed") and project_id and user_id:
        assets.append(await _enqueue_video(state, strategy, project_id, user_id))

    return {
        "assets": assets,
        "current_node": "asset_gen",
        "tier_used": {"asset_gen": "video_pipeline"},
        "cost_usd": 0.0,
    }


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
