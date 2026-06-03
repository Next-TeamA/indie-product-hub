"""Publish node — 실제 멀티 채널 발행.

기획서 §4 + §6.

흐름:
1. 각 draft를 promotion_posts에 INSERT (status=publishing)
2. 기존 _do_publish 재사용 (X/Threads 실제 발행)
3. IG/YT/TikTok는 신규 클라이언트 (Wave 4 — 현재 X/Threads 우선)
4. 결과를 publish_results에 기록

reply format은 발행 대신 interactions 테이블 경로 (engagement graph에서 처리).
"""

from datetime import datetime, timezone

from app.agents.graph_state import AMPState
from app.core.supabase import supabase

# 현재 실제 발행 지원 채널 (기존 _do_publish)
SUPPORTED_NOW = {"x", "threads"}


async def publish_node(state: AMPState) -> dict:
    project_id = state["project_id"]
    user_id = state["user_id"]
    drafts = state.get("drafts") or []
    workflow_run_id = state.get("trigger", {}).get("workflow_run_id")

    results = []
    for draft in drafts:
        channel = draft.get("channel")

        # promotion_posts INSERT
        row = {
            "project_id": project_id,
            "user_id": user_id,
            "platform": channel,
            "hook": draft.get("hook", ""),
            "content": draft.get("content", ""),
            "hashtags": draft.get("hashtags", []),
            "images": draft.get("images", []),
            "status": "publishing",
            "ai_model": draft.get("model"),
            "voice_match_score": draft.get("voice_match_score"),
            "lang": draft.get("lang"),
            "ai_metadata": {"source": "amp_langgraph", "workflow_run_id": workflow_run_id},
        }
        try:
            inserted = supabase.table("promotion_posts").insert(row).execute()
            post = inserted.data[0]
        except Exception as e:
            results.append({"channel": channel, "status": "failed", "error": f"insert: {e}"[:200]})
            continue

        # 실제 발행 (X/Threads는 기존 _do_publish 재사용)
        if channel in SUPPORTED_NOW:
            try:
                from app.api.routes.promotion import _do_publish
                await _do_publish(user_id, post)
                # _do_publish가 status를 published/failed로 업데이트함 → 재조회
                fresh = (
                    supabase.table("promotion_posts")
                    .select("status, external_post_id, publish_error")
                    .eq("id", post["id"])
                    .single()
                    .execute()
                )
                results.append({
                    "channel": channel,
                    "post_id": post["id"],
                    "status": fresh.data.get("status"),
                    "external_id": fresh.data.get("external_post_id"),
                    "error": fresh.data.get("publish_error"),
                })
            except Exception as e:
                supabase.table("promotion_posts").update({
                    "status": "failed", "publish_error": str(e)[:500],
                }).eq("id", post["id"]).execute()
                results.append({"channel": channel, "post_id": post["id"], "status": "failed", "error": str(e)[:200]})
        else:
            # IG/YT/TikTok/LinkedIn: Wave 4에서 연결 — 지금은 draft로 보존
            supabase.table("promotion_posts").update({"status": "draft"}).eq("id", post["id"]).execute()
            results.append({
                "channel": channel, "post_id": post["id"], "status": "draft",
                "note": f"{channel} publisher pending (Wave 4) — saved as draft",
            })

    return {
        "publish_results": results,
        "current_node": "publish",
        "cost_usd": 0.0,
    }
