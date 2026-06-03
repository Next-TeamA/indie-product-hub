"""Strategy Agent node.

기획서 §4.2 -- 무엇을 어디에 언제 발행할지 결정.

Wave 2 LLM 통합. 4가지 trigger type 모두 처리:
- manual           : 사용자가 입력한 topic/channels/audience/tone 사용
- github.push      : 최근 커밋 메시지 분석으로 발행 가치 판단
- scheduled.*      : market_insights / project_knowledge 활용한 정기 발행
- mention          : interaction payload 기반 답글 strategy

LLM 호출은 Gemini Flash (저렴 + 빠름). JSON 응답 강제.
실패 시 안전한 fallback: should_publish=false + reasoning에 사유.
"""

import json
from typing import Any

from app.agents.graph_state import AMPState
from app.agents.llm_router import call_for_task, pick_tier
from app.core.supabase import safe_maybe_single, supabase


VALID_CHANNELS = {"x", "threads", "instagram", "youtube", "tiktok", "linkedin"}
VALID_FORMATS = {"single", "thread", "video", "reply"}


async def strategy_node(state: AMPState) -> dict:
    """Decide should_publish + channels + format + topic + tone hint via LLM."""
    trigger = state.get("trigger", {})
    trigger_type = trigger.get("type", "manual")
    payload = trigger.get("payload") or {}

    # mention은 별도 분기 (사람 댓글에 대한 답글 — channels는 멘션 받은 곳 그대로)
    if trigger_type == "mention":
        return _mention_strategy(payload)

    # manual에서 사용자가 명시한 입력이 있으면 그대로 사용 (LLM 호출 절약 + 정확도)
    if trigger_type == "manual":
        explicit = _explicit_from_payload(payload)
        if explicit:
            return explicit

    # LLM이 결정해야 하는 케이스: github.push, scheduled.*, manual(빈 입력)
    project_id = state.get("project_id")
    project_ctx = await _build_project_context(project_id)
    trigger_brief = _summarize_trigger(trigger_type, payload, project_ctx)

    try:
        decision = await _llm_decide(trigger_type, trigger_brief, project_ctx)
    except Exception as e:
        return _fallback(trigger_type, f"LLM 호출 실패: {e}")

    return _normalize_decision(decision, trigger_type, fallback_reason=None)


# ============================================================
# Manual: explicit payload (사용자가 모달에서 입력)
# ============================================================

def _explicit_from_payload(payload: dict) -> dict | None:
    """payload에 사용자가 명시한 topic/channels가 있으면 LLM 안 거치고 바로 사용."""
    topic = (payload.get("topic") or "").strip()
    channels = payload.get("channels") or []
    if not topic or not isinstance(channels, list) or not channels:
        return None

    valid_ch = [c for c in channels if c in VALID_CHANNELS]
    if not valid_ch:
        return None

    tone_hint = (payload.get("tone") or "").strip()
    audience = (payload.get("audience") or "").strip()
    format_ = payload.get("format") or "single"
    if format_ not in VALID_FORMATS:
        format_ = "single"

    return {
        "strategy": {
            "should_publish": True,
            "channels": valid_ch,
            "format": format_,
            "topic": topic,
            "tone_hint": tone_hint or None,
            "audience": audience or None,
            "image_needed": bool(payload.get("image_needed")),
            "video_needed": bool(payload.get("video_needed") or format_ == "video"),
            "reasoning": "Manual explicit input -- LLM bypass.",
        },
        "current_node": "strategy",
        "tier_used": {"strategy": "explicit"},
        "cost_usd": 0.0,
    }


# ============================================================
# Mention: 멘션 받은 곳에 답글 (LLM 안 거침)
# ============================================================

def _mention_strategy(payload: dict) -> dict:
    platform = payload.get("platform") or "threads"
    return {
        "strategy": {
            "should_publish": True,
            "channels": [platform] if platform in VALID_CHANNELS else ["threads"],
            "format": "reply",
            "topic": payload.get("content_excerpt") or payload.get("content") or "(mention reply)",
            "tone_hint": "친근한 답글, 짧고 자연스럽게",
            "image_needed": False,
            "video_needed": False,
            "reasoning": f"Mention reply on {platform}",
        },
        "current_node": "strategy",
        "tier_used": {"strategy": "mention-rule"},
        "cost_usd": 0.0,
    }


# ============================================================
# Project context for LLM
# ============================================================

async def _build_project_context(project_id: str | None) -> dict[str, Any]:
    """Pull project info + recent commits + recent market insights summary."""
    if not project_id:
        return {}

    project = safe_maybe_single(
        supabase.table("projects").select("name, description, prd, target_audience").eq("id", project_id)
    ) or {}

    # 최근 마켓 인사이트 (있으면)
    try:
        market = (
            supabase.table("market_insights")
            .select("summary, created_at")
            .eq("project_id", project_id)
            .order("created_at", desc=True)
            .limit(3)
            .execute()
            .data
        ) or []
    except Exception:
        market = []

    # 페르소나 (voice 톤 가이드용)
    persona = safe_maybe_single(
        supabase.table("personas").select("voice_profile").eq("project_id", project_id)
    ) or {}

    return {
        "project": project,
        "market_insights": [m.get("summary", "") for m in market if m.get("summary")],
        "persona_voice": persona.get("voice_profile") or {},
    }


def _summarize_trigger(trigger_type: str, payload: dict, ctx: dict) -> str:
    if trigger_type == "github.push":
        commits = payload.get("commits", [])
        msgs = [c.get("message", "") for c in commits[:5]]
        modified = sum(len(c.get("modified", []) + c.get("added", [])) for c in commits)
        return (
            f"GitHub push event\n"
            f"커밋 {len(commits)}개, 파일 변경 {modified}개\n"
            + "\n".join(f"- {m}" for m in msgs[:5])
        )
    if trigger_type == "scheduled.weekly_summary":
        market = "\n".join(f"- {m[:200]}" for m in ctx.get("market_insights", [])[:3])
        return f"주간 요약 정기 발행\n최근 마켓 인사이트:\n{market or '(없음)'}"
    if trigger_type == "manual":
        msg = payload.get("message") or payload.get("hint") or ""
        return f"수동 트리거\n사용자 힌트: {msg or '(없음)'}"
    return f"트리거: {trigger_type}\n{json.dumps(payload, ensure_ascii=False)[:500]}"


# ============================================================
# LLM call
# ============================================================

_STRATEGY_SYSTEM = (
    "You are the strategy agent of an autonomous marketing platform for indie SaaS products. "
    "Decide whether to publish, which channels to use, the topic, the format, and a tone hint. "
    "Output strict JSON only. Be conservative -- if there is no real news to share, set should_publish=false."
)


def _strategy_prompt(trigger_type: str, trigger_brief: str, ctx: dict) -> str:
    project = ctx.get("project") or {}
    persona = ctx.get("persona_voice") or {}

    persona_block = ""
    if persona:
        if persona.get("tone"):
            persona_block += f"- 톤: {persona['tone']}\n"
        if persona.get("avg_sentence_length"):
            persona_block += f"- 평균 문장 길이: {persona['avg_sentence_length']}\n"

    return f"""제품: {project.get('name', '')}
설명: {project.get('description', '')}
타겟: {project.get('target_audience', 'indie builders / 1인 SaaS 창업가')}

사용자 voice 프로필:
{persona_block or '(없음)'}

이번 트리거:
{trigger_brief}

다음 JSON 스키마로만 답하라. 다른 텍스트 절대 금지:
{{
  "should_publish": true | false,
  "channels": ["x", "threads", "instagram", "youtube", "tiktok", "linkedin" 중 0~3개],
  "format": "single" | "thread" | "video" | "reply",
  "topic": "이번 발행의 핵심 주제 한 줄 (없으면 빈 문자열)",
  "tone_hint": "어떤 톤으로 쓸지 한 줄",
  "image_needed": true | false,
  "video_needed": true | false,
  "reasoning": "왜 이 결정인지 한두 문장"
}}

판단 기준:
- 새 기능 출시 / 의미 있는 fix / 마일스톤이면 should_publish=true
- 단순 리팩터/사소한 fix는 false (홍보 가치 없음)
- weekly_summary는 기본 true이지만 발행할 내용이 진짜 없으면 false
- 채널은 콘텐츠 성격에 맞게: 영상이면 youtube/tiktok/instagram, 텍스트는 x/threads/linkedin
- video_needed가 true면 format은 "video"여야 함
"""


async def _llm_decide(trigger_type: str, trigger_brief: str, ctx: dict) -> dict:
    tier = pick_tier("strategy", "low")
    resp = await call_for_task(
        "strategy",
        system=_STRATEGY_SYSTEM,
        messages=[{"role": "user", "content": _strategy_prompt(trigger_type, trigger_brief, ctx)}],
        complexity="low",
        response_format="json",
    )

    parsed = resp.get("parsed_json")
    if parsed is None:
        raw = resp.get("content") or "{}"
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = {}

    parsed["_cost_usd"] = float(resp.get("cost_usd") or 0.0)
    parsed["_tier"] = tier.value
    return parsed


# ============================================================
# Normalize LLM output -- guard against bad values
# ============================================================

def _normalize_decision(decision: dict, trigger_type: str, fallback_reason: str | None) -> dict:
    should_publish = bool(decision.get("should_publish"))
    channels_in = decision.get("channels") or []
    channels = [c for c in channels_in if isinstance(c, str) and c in VALID_CHANNELS][:3]

    format_ = decision.get("format") or "single"
    if format_ not in VALID_FORMATS:
        format_ = "single"
    if decision.get("video_needed") and format_ != "reply":
        format_ = "video"

    if should_publish and not channels:
        # LLM이 should_publish=true인데 채널을 비웠으면 안전 default
        channels = ["x", "threads"] if format_ != "video" else ["youtube"]

    return {
        "strategy": {
            "should_publish": should_publish,
            "channels": channels,
            "format": format_,
            "topic": (decision.get("topic") or "").strip(),
            "tone_hint": (decision.get("tone_hint") or "").strip() or None,
            "image_needed": bool(decision.get("image_needed")),
            "video_needed": bool(decision.get("video_needed") or format_ == "video"),
            "reasoning": fallback_reason or decision.get("reasoning") or "(no reason)",
        },
        "current_node": "strategy",
        "tier_used": {"strategy": decision.get("_tier", "flash")},
        "cost_usd": float(decision.get("_cost_usd") or 0.0),
    }


def _fallback(trigger_type: str, reason: str) -> dict:
    return {
        "strategy": {
            "should_publish": False,
            "channels": [],
            "format": "single",
            "topic": "",
            "tone_hint": None,
            "image_needed": False,
            "video_needed": False,
            "reasoning": reason,
        },
        "current_node": "strategy",
        "tier_used": {"strategy": "fallback"},
        "cost_usd": 0.0,
    }
