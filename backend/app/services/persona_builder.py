"""Persona builder -- import past posts + LLM-extracted voice profile.

기획서 §8 (페르소나 & Voice 학습):
- Stage 1 초기 페르소나: X/Threads 과거 글 import → voice_samples + embedding
- LLM(Tier 3 = Gemini 3.1 Pro) 1회 호출로 voice_profile 추출
  (평균 문장 길이, 이모지 빈도, 의문형 비율, 1인칭 빈도, 시작 문구,
   의견 corpus, AI 티 forbidden phrases, preferred phrases)

supabase 클라이언트는 동기 (await 없이 .execute()).
"""

import json
from datetime import datetime, timezone

from app.agents.llm_router import call_for_task
from app.core.encryption import decrypt_token
from app.core.supabase import supabase, safe_maybe_single
from app.integrations.threads_api import threads_client
from app.integrations.x_api import x_client
from app.services import embedding_service


async def import_voice_samples(
    project_id: str,
    user_id: str,
    platform: str,
    count: int = 50,
) -> dict:
    """Pull recent posts from X or Threads → voice_samples + index them.

    Returns {imported, indexed, platform}.
    """
    account = safe_maybe_single(
        supabase.table("connected_accounts")
        .select("access_token, provider_user_id")
        .eq("user_id", user_id)
        .eq("provider", platform)
        .eq("is_active", True)
    )
    if not account:
        return {"imported": 0, "indexed": 0, "platform": platform, "error": f"{platform} not connected"}

    token = decrypt_token(account["access_token"])
    provider_user_id = account["provider_user_id"]

    if platform == "x":
        raw = await x_client.get_user_tweets_with_metrics(token, provider_user_id, max_results=count)
        posts = [
            {
                "source_post_id": p.get("tweet_id"),
                "content": p.get("text", ""),
                "engagement_score": p.get("engagement_rate", 0.0),
            }
            for p in raw
        ]
    elif platform == "threads":
        raw = await threads_client.get_user_posts_with_insights(token, provider_user_id, limit=count)
        posts = [
            {
                "source_post_id": p.get("post_id"),
                "content": p.get("text", ""),
                "engagement_score": float(
                    p.get("likes", 0) + p.get("replies", 0) + p.get("reposts", 0)
                ),
            }
            for p in raw
        ]
    else:
        return {"imported": 0, "indexed": 0, "platform": platform, "error": "unsupported platform"}

    rows = [
        {
            "project_id": project_id,
            "source_platform": platform,
            "source_post_id": p["source_post_id"],
            "content": p["content"],
            "engagement_score": p["engagement_score"],
        }
        for p in posts
        if (p.get("content") or "").strip()
    ]
    if not rows:
        return {"imported": 0, "indexed": 0, "platform": platform}

    # 중복 import 방지: 같은 platform의 기존 샘플 비우고 새로 적재
    (
        supabase.table("voice_samples")
        .delete()
        .eq("project_id", project_id)
        .eq("source_platform", platform)
        .execute()
    )
    supabase.table("voice_samples").insert(rows).execute()

    indexed = await embedding_service.reindex_voice_samples(project_id)
    return {"imported": len(rows), "indexed": indexed, "platform": platform}


_PERSONA_SYSTEM = (
    "You are a voice analyst. You study a user's past social posts and extract a "
    "precise, reusable voice profile so an AI can write new posts that sound exactly "
    "like the user. Be specific and quantitative. Never use emojis in your analysis. "
    "Output strictly valid JSON."
)


async def build_persona(project_id: str) -> dict:
    """Analyze voice_samples with the LLM → upsert personas row.

    Returns the persona dict (voice_profile, opinion_corpus, forbidden_phrases,
    preferred_phrases).
    """
    samples = (
        supabase.table("voice_samples")
        .select("content, engagement_score, source_platform")
        .eq("project_id", project_id)
        .order("engagement_score", desc=True)
        .limit(100)
        .execute()
    )
    rows = samples.data or []
    if not rows:
        return {"error": "no voice samples — import first"}

    sample_block = "\n".join(
        f"[{r.get('source_platform', '?')}] {(r.get('content') or '')[:300]}"
        for r in rows
    )

    prompt = f"""아래는 한 사용자의 과거 SNS 글 {len(rows)}개다. 이 사람의 voice를 분석하라.

== 과거 글 ==
{sample_block}

다음 JSON 스키마로만 응답하라:
{{
  "voice_profile": {{
    "avg_sentence_length": <평균 문장 길이, 단어 수 정수>,
    "emoji_freq": <글당 평균 이모지 개수, 소수>,
    "question_ratio": <의문형 문장 비율 0.0~1.0>,
    "first_person_freq": <1인칭(나/저/we 등) 사용 비율 0.0~1.0>,
    "typical_starts": ["자주 쓰는 글 시작 문구 3~5개"],
    "tone": "한 문장으로 톤 요약"
  }},
  "opinion_corpus": ["이 사람이 반복적으로 드러내는 의견/입장 5~10개"],
  "forbidden_phrases": ["이 사람이 절대 안 쓰는, AI 티 나는 표현 5~10개"],
  "preferred_phrases": ["이 사람이 즐겨 쓰는 표현/단어 5~10개"]
}}
"""

    resp = await call_for_task(
        "content",
        system=_PERSONA_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
        complexity="high",
        response_format="json",
    )

    parsed = resp.get("parsed_json")
    if parsed is None:
        try:
            parsed = json.loads(resp.get("content") or "{}")
        except (json.JSONDecodeError, TypeError):
            parsed = {}
    if not isinstance(parsed, dict):
        parsed = {}

    persona_row = {
        "project_id": project_id,
        "voice_profile": parsed.get("voice_profile") or {},
        "opinion_corpus": parsed.get("opinion_corpus") or [],
        "forbidden_phrases": parsed.get("forbidden_phrases") or [],
        "preferred_phrases": parsed.get("preferred_phrases") or [],
        "last_updated_at": datetime.now(timezone.utc).isoformat(),
    }

    result = (
        supabase.table("personas")
        .upsert(persona_row, on_conflict="project_id")
        .execute()
    )
    return (result.data[0] if result.data else persona_row)
