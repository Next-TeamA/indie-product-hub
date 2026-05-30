"""Content Agent node — 실제 voice 매칭 멀티 채널 카피 작성.

기획서 §4.3 + §부록 F (voice RAG).

흐름:
1. build_agent_context로 project + KB + tokens 로드
2. voice samples (최근 published posts) + KB를 컨텍스트로
3. 채널별 llm_router(content, high=Gemini Pro)로 카피 생성
4. promotion 스킬 프롬프트 + 채널 규칙 적용
"""

import json

from app.agents.graph_state import AMPState
from app.agents.llm_router import call_for_task, estimate_cost, pick_tier
from app.workspace.skill_loader import get_skill_prompt


CHANNEL_RULES = {
    "x": "280자 이내. 첫 줄 강한 후킹. 해시태그 0-2개. URL은 본문 대신 별도. 캐주얼+자신감.",
    "threads": "500자 이내 (넘으면 스레드 분할). 스토리텔링 OK. 해시태그 0-3개.",
    "instagram": "캡션 최대 2200자. 첫 줄이 핵심. 해시태그 5-10개. 비주얼 설명 포함.",
    "youtube": "Shorts 설명. 제목 후킹 + #Shorts. 짧고 임팩트.",
    "tiktok": "트렌디, 짧고 강렬. 첫 1초 후킹.",
    "linkedin": "전문적이되 개인적. 800-1500자. 줄바꿈 많이.",
}

_DEFAULT_SYSTEM = (
    "You are a senior social media copywriter for an indie software product. "
    "Write in the user's authentic voice. No generic AI phrases. "
    "Match the user's past successful posts. Never use emojis unless the samples do. "
    "Output the requested language."
)


async def content_node(state: AMPState) -> dict:
    from app.agents.core import build_agent_context
    from app.services import voice_matcher

    project_id = state["project_id"]
    user_id = state["user_id"]
    strategy = state.get("strategy") or {}
    channels = strategy.get("channels", [])
    trigger = state.get("trigger", {})

    ctx = await build_agent_context(project_id, user_id)
    project = ctx.project
    knowledge = ctx.knowledge

    # 트리거 컨텍스트 (예: 커밋 메시지) — voice 검색 쿼리로도 사용
    trigger_summary = _summarize_trigger(trigger)

    # voice context: persona profile + RAG로 검색한 가장 관련있는 과거 글 (기획서 §8)
    voice_query = f"{project.get('name', '')} {strategy.get('topic') or trigger_summary}"
    voice_ctx = await voice_matcher.get_voice_context(project_id, voice_query)
    persona = voice_ctx.get("persona") or {}
    voice_samples = voice_ctx.get("examples") or []

    # 언어 결정
    langs = project.get("primary_languages") or ["ko"]
    primary_lang = langs[0] if langs else "ko"

    skill_prompt = get_skill_prompt("promotion") or _DEFAULT_SYSTEM

    drafts = []
    total_cost = 0.0
    tier = pick_tier("content", "high")

    for ch in channels:
        prompt = _build_prompt(
            project=project,
            knowledge=knowledge,
            voice_samples=voice_samples,
            persona=persona,
            trigger_summary=trigger_summary,
            channel=ch,
            lang=primary_lang,
        )
        resp = await call_for_task(
            "content",
            system=skill_prompt,
            messages=[{"role": "user", "content": prompt}],
            complexity="high",
            response_format="json",
        )

        parsed = resp.get("parsed_json")
        if parsed is None:
            try:
                parsed = json.loads(resp.get("content") or "{}")
            except json.JSONDecodeError:
                parsed = {"hook": "", "content": resp.get("content", ""), "hashtags": []}

        total_cost += resp.get("cost_usd", 0.0)
        drafts.append({
            "channel": ch,
            "hook": parsed.get("hook", ""),
            "content": parsed.get("content", ""),
            "hashtags": parsed.get("hashtags", []),
            "lang": primary_lang,
            "format": strategy.get("format", "single"),
            "voice_match_score": parsed.get("voice_match_score", 0.0),
            "model": resp.get("model"),
        })

    return {
        "drafts": drafts,
        "current_node": "content",
        "tier_used": {"content": tier.value},
        "cost_usd": total_cost,
    }


def _summarize_trigger(trigger: dict) -> str:
    t = trigger.get("type", "")
    payload = trigger.get("payload", {})
    if t == "github.push":
        commits = payload.get("commits", [])
        msgs = [c.get("message", "") for c in commits[:5]]
        return "최근 커밋:\n" + "\n".join(f"- {m}" for m in msgs)
    if t == "scheduled.weekly_summary":
        return "이번 주 활동 요약 영상/포스트"
    if t == "manual":
        return payload.get("message", "수동 발행 요청")
    return f"트리거: {t}"


def _build_prompt(project, knowledge, voice_samples, persona, trigger_summary, channel, lang) -> str:
    kb_snippet = ""
    for cat in ("project_readme", "commit_activity", "sns_performance"):
        if cat in knowledge:
            kb_snippet += f"\n[{cat}]\n{knowledge[cat][:500]}\n"

    voice_block = "\n".join(voice_samples) if voice_samples else "(과거 글 없음 — 제품 설명 기반으로)"
    persona_block = _format_persona(persona)
    lang_label = {"ko": "한국어", "en": "English"}.get(lang, lang)

    return f"""제품: {project.get('name', '')}
설명: {project.get('description', '')}
타겟: {project.get('target_audience', 'indie builders / developers')}

== 사용자 voice 프로필 (이 스타일을 정확히 재현하라) ==
{persona_block}

== 사용자의 과거 글 (이 voice를 따라하라) ==
{voice_block}

== 프로젝트 지식 ==
{kb_snippet or '(없음)'}

== 발행 계기 ==
{trigger_summary}

== 작성 요청 ==
채널: {channel}
채널 규칙: {CHANNEL_RULES.get(channel, '')}
언어: {lang_label}

위 voice를 정확히 따라 {channel}용 홍보글을 작성하라.
AI 티 나는 표현 금지. 구체적 숫자/디테일 선호.

JSON으로만 응답:
{{"hook": "첫 줄 후킹", "content": "본문", "hashtags": ["태그1"], "voice_match_score": 0.0~1.0}}"""


def _format_persona(persona: dict) -> str:
    """Render persona voice_profile + forbidden/preferred phrases into the prompt."""
    if not persona:
        return "(분석된 voice 프로필 없음)"

    vp = persona.get("voice_profile") or {}
    lines = []
    if vp:
        if vp.get("tone"):
            lines.append(f"- 톤: {vp['tone']}")
        if vp.get("avg_sentence_length"):
            lines.append(f"- 평균 문장 길이: {vp['avg_sentence_length']} 단어")
        if vp.get("emoji_freq") is not None:
            lines.append(f"- 이모지 빈도: 글당 {vp['emoji_freq']}개")
        if vp.get("question_ratio") is not None:
            lines.append(f"- 의문형 비율: {vp['question_ratio']}")
        if vp.get("first_person_freq") is not None:
            lines.append(f"- 1인칭 사용: {vp['first_person_freq']}")
        if vp.get("typical_starts"):
            lines.append(f"- 자주 쓰는 시작 문구: {', '.join(vp['typical_starts'][:5])}")

    preferred = persona.get("preferred_phrases") or []
    forbidden = persona.get("forbidden_phrases") or []
    if preferred:
        lines.append(f"- 선호 표현 (적극 활용): {', '.join(preferred[:10])}")
    if forbidden:
        lines.append(f"- 금지 표현 (절대 사용 X): {', '.join(forbidden[:10])}")

    return "\n".join(lines) if lines else "(분석된 voice 프로필 없음)"
