"""Two-week promotion campaign generation pipeline.

This is intentionally a fixed multi-step agent chain instead of a fully
autonomous chat agent. Each step owns one decision layer so the final 14 posts
stay strategic, varied, and easy to validate.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import re
from zoneinfo import ZoneInfo

from app.core.exceptions import ExternalAPIError, ValidationError
from app.core.supabase import supabase
from app.integrations import gemini
from app.models.promotion import PromotionCampaignRequest
from app.workspace.skill_loader import get_skill_prompt

MODEL = "gemini-2.5-flash"
CAMPAIGN_DAYS = 14
DEFAULT_POST_HOUR = 19
SEOUL = ZoneInfo("Asia/Seoul")
PROMOTION_SKILL = get_skill_prompt("promotion")

CONTENT_TYPE_MAP = {
    "문제 공감형": "qa",
    "논쟁형": "qa",
    "체크리스트형": "tip",
    "상황극형": "qa",
    "비교형": "tip",
    "실수/실패 사례형": "retrospective",
    "기능 소개형": "update",
    "가치 제안형": "launch",
    "후기/가상 후기형": "qa",
    "직접 CTA형": "launch",
    "질문형": "qa",
    "팁 제공형": "tip",
}


def _input_dict(body: PromotionCampaignRequest) -> dict:
    return body.model_dump()


def _common_context(body: PromotionCampaignRequest) -> str:
    return f"""
Project name: {body.project_name}
One-line description: {body.one_line_description}
Expected target user: {body.target_user}
Problem to solve: {body.problem}
Core value: {body.core_value}
Main features: {body.main_features}
Promotion goal: {body.promotion_goal}
Channel: {body.channel}
Tone preference: {body.tone_preference}
Additional context: {body.additional_context or "N/A"}
"""


def _ensure_dict(value: object, step: str) -> dict:
    if not isinstance(value, dict):
        raise ExternalAPIError("Gemini", f"{step} returned non-object JSON")
    return value


def _ensure_list(value: object, step: str) -> list:
    if not isinstance(value, list):
        raise ExternalAPIError("Gemini", f"{step} returned non-array JSON")
    return value


async def _save_step(campaign_id: str, step_name: str, output: dict | list) -> None:
    supabase.table("promotion_campaign_steps").insert({
        "campaign_id": campaign_id,
        "step_name": step_name,
        "output": output,
    }).execute()


async def _target_analysis(body: PromotionCampaignRequest) -> dict:
    prompt = f"""
You are a product marketing strategist.

Analyze the target for a finished product promotion campaign. Do not write posts.

Input:
{_common_context(body)}

Return only JSON:
{{
  "targetUser": "specific target user definition",
  "painPoints": ["realistic pain point", "..."],
  "desires": ["desire or aspiration", "..."],
  "attentionHooks": ["feed hook angle", "..."]
}}
"""
    result = await gemini.generate_json(prompt=prompt, system="Analyze target users for product marketing. Be concrete, not generic.", model=MODEL)
    return _ensure_dict(result, "target_analysis")


async def _campaign_strategy(body: PromotionCampaignRequest, target_analysis: dict) -> dict:
    prompt = f"""
You are a campaign strategist for finished SaaS/product promotion.

Do not create build-in-public developer diary content.
Create a 14-day Threads campaign strategy for strategic product promotion.

Input:
{_common_context(body)}

Target analysis:
{target_analysis}

Content type options:
- 문제 공감형
- 논쟁형
- 체크리스트형
- 상황극형
- 비교형
- 실수/실패 사례형
- 기능 소개형
- 가치 제안형
- 후기/가상 후기형
- 직접 CTA형
- 질문형
- 팁 제공형

Return only JSON:
{{
  "goal": "campaign goal",
  "duration": "14 days",
  "overallMood": "overall mood",
  "contentPrinciple": "one guiding principle",
  "avoidRules": ["rule", "..."],
  "contentMix": [
    {{"contentType": "문제 공감형", "count": 2}}
  ]
}}
"""
    result = await gemini.generate_json(prompt=prompt, system="Plan varied product promotion campaigns. Avoid repetitive sales copy.", model=MODEL)
    return _ensure_dict(result, "campaign_strategy")


async def _calendar_plan(body: PromotionCampaignRequest, target_analysis: dict, strategy: dict) -> list:
    prompt = f"""
You are a 14-day SNS editorial calendar planner.

Plan exactly 14 different Threads posts. Do not write final drafts yet.
Each day must have a different topic angle, hook style, and message.
Do not repeat the same product benefit every day.

Input:
{_common_context(body)}

Target analysis:
{target_analysis}

Campaign strategy:
{strategy}

Return only a JSON array with exactly 14 objects:
[
  {{
    "day": 1,
    "contentType": "문제 공감형",
    "postGoal": "what this post should achieve",
    "topic": "specific topic",
    "hookStyle": "specific hook technique",
    "coreMessage": "one core message",
    "cta": "clear CTA",
    "assignedInfo": "which input/context this post uses"
  }}
]
"""
    result = await gemini.generate_json(prompt=prompt, system="Create non-overlapping content calendars for product marketing.", model=MODEL)
    plan = _ensure_list(result, "calendar_planning")
    if len(plan) != CAMPAIGN_DAYS:
        raise ExternalAPIError("Gemini", f"calendar_planning returned {len(plan)} items, expected 14")
    return plan


async def _draft_posts(body: PromotionCampaignRequest, target_analysis: dict, strategy: dict, calendar: list) -> list:
    prompt = f"""
You are a Threads copywriter for finished product promotion.

Write actual post drafts for the 14-day calendar.

Promotion writing skill:
{PROMOTION_SKILL or "No promotion skill document is available. Follow the rules below."}

Rules:
- Korean by default unless the input clearly asks otherwise.
- Threads tone: conversational, concrete, community-aware.
- Each draft must be 500 characters or less.
- Each draft must include a clear CTA.
- Do not use emojis.
- Do not sound like an ad.
- Do not use cliches like "혁신적인", "최고의", "생산성을 극대화", "게임 체인저".
- Do not write build-in-public diary posts.
- Start from realistic situations the target user faces.

Input:
{_common_context(body)}

Target analysis:
{target_analysis}

Campaign strategy:
{strategy}

Calendar:
{calendar}

Return only a JSON array with exactly 14 objects:
[
  {{
    "day": 1,
    "hook": "opening hook, one sentence",
    "content": "post body without repeating the hook",
    "draft": "hook + newline + body"
  }}
]
"""
    result = await gemini.generate_json(prompt=prompt, system="Write natural, non-salesy Threads drafts for product promotion.", model=MODEL)
    drafts = _ensure_list(result, "draft_writing")
    if len(drafts) != CAMPAIGN_DAYS:
        raise ExternalAPIError("Gemini", f"draft_writing returned {len(drafts)} items, expected 14")
    return drafts


async def _review_campaign(body: PromotionCampaignRequest, target_analysis: dict, strategy: dict, calendar: list, drafts: list) -> dict:
    merged = []
    draft_by_day = {int(d.get("day", 0)): d for d in drafts if isinstance(d, dict)}
    for item in calendar:
        if not isinstance(item, dict):
            continue
        day = int(item.get("day", len(merged) + 1))
        draft_item = draft_by_day.get(day, {})
        merged.append({
            **item,
            "day": day,
            "hook": draft_item.get("hook", ""),
            "content": draft_item.get("content", ""),
            "draft": draft_item.get("draft", ""),
        })

    prompt = f"""
You are the final editor for a 14-day product promotion campaign.

Review and revise the campaign so it passes all rules.

Input:
{_common_context(body)}

Target analysis:
{target_analysis}

Campaign strategy:
{strategy}

Draft calendar:
{merged}

Review rules:
- Same message must not repeat.
- Not every post can say "our service is good".
- Do not repeat feature introductions.
- Each post should use a different hook style or content type.
- Avoid ad-like expressions.
- Avoid "혁신적인", "최고의", "생산성을 극대화", "게임 체인저".
- Start from realistic target-user situations.
- Every post needs a clear CTA.
- Keep Threads length and tone.
- Do not default to build-in-public diary tone.

Return only JSON:
{{
  "passed": true,
  "issues": [
    {{"day": 3, "issue": "what was fixed"}}
  ],
  "finalCalendar": [
    {{
      "day": 1,
      "contentType": "문제 공감형",
      "postGoal": "",
      "topic": "",
      "hookStyle": "",
      "coreMessage": "",
      "cta": "",
      "assignedInfo": "",
      "hook": "",
      "content": "",
      "draft": ""
    }}
  ]
}}
"""
    result = await gemini.generate_json(prompt=prompt, system="Edit campaigns for variety, clarity, and non-ad-like product marketing.", model=MODEL)
    review = _ensure_dict(result, "review")
    final_calendar = review.get("finalCalendar")
    if not isinstance(final_calendar, list) or len(final_calendar) != CAMPAIGN_DAYS:
        raise ExternalAPIError("Gemini", "review did not return exactly 14 finalCalendar items")
    return review


def _post_content_type(content_type: str | None) -> str:
    if not content_type:
        return "tip"
    return CONTENT_TYPE_MAP.get(content_type, "tip")


def _split_hook_and_content(draft: str, topic: str) -> tuple[str, str]:
    """Separate a generated draft's opening hook from the remaining body."""
    cleaned = draft.strip()
    fallback = topic.strip()
    if not cleaned:
        return fallback[:160], fallback

    lines = [line.strip() for line in cleaned.splitlines() if line.strip()]
    if len(lines) > 1:
        hook = lines[0]
        content = "\n\n".join(lines[1:]).strip()
        return hook[:160], content or cleaned

    sentence_match = re.match(r"^(.+?[.!?。！？]|.+?[다요죠까네])(?:\s+|$)(.*)$", cleaned, re.DOTALL)
    if sentence_match:
        hook = sentence_match.group(1).strip()
        content = sentence_match.group(2).strip()
        return hook[:160], content or cleaned

    return cleaned[:160], cleaned


def _remove_repeated_hook(hook: str, content: str) -> str:
    normalized_hook = hook.strip()
    normalized_content = content.strip()
    if normalized_hook and normalized_content.startswith(normalized_hook):
        return normalized_content[len(normalized_hook):].lstrip("\n\r\t -")
    lines = [line.strip() for line in normalized_content.splitlines() if line.strip()]
    if len(lines) > 1 and _same_text(normalized_hook, lines[0]):
        return "\n\n".join(lines[1:]).strip()
    sentence_match = re.match(r"^(.+?[.!?。！？]|.+?[다요죠까네])(?:\s+|$)(.*)$", normalized_content, re.DOTALL)
    if sentence_match and _same_text(normalized_hook, sentence_match.group(1)):
        return sentence_match.group(2).strip()
    return normalized_content


def _same_text(a: str, b: str) -> bool:
    def compact(value: str) -> str:
        return re.sub(r"[\s\"'“”‘’.,!?。！？…·:;~-]+", "", value).lower()

    compact_a = compact(a)
    compact_b = compact(b)
    return bool(compact_a and compact_b and (compact_a == compact_b or compact_a.startswith(compact_b) or compact_b.startswith(compact_a)))


def _scheduled_at_for_day(day: int) -> str:
    now = datetime.now(SEOUL)
    target = (now + timedelta(days=day)).replace(
        hour=DEFAULT_POST_HOUR,
        minute=0,
        second=0,
        microsecond=0,
    )
    return target.isoformat()


async def create_campaign(project_id: str, user_id: str, body: PromotionCampaignRequest) -> dict:
    """Run the promotion campaign chain and persist campaign + 14 dated drafts."""
    campaign_insert = supabase.table("promotion_campaigns").insert({
        "project_id": project_id,
        "user_id": user_id,
        "input": _input_dict(body),
        "status": "generating",
    }).execute()
    if not campaign_insert.data:
        raise ValidationError("Failed to create promotion campaign")

    campaign = campaign_insert.data[0]
    campaign_id = campaign["id"]

    try:
        target_analysis = await _target_analysis(body)
        await _save_step(campaign_id, "target_analysis", target_analysis)

        strategy = await _campaign_strategy(body, target_analysis)
        await _save_step(campaign_id, "campaign_strategy", strategy)

        calendar = await _calendar_plan(body, target_analysis, strategy)
        await _save_step(campaign_id, "calendar_planning", calendar)

        drafts = await _draft_posts(body, target_analysis, strategy, calendar)
        await _save_step(campaign_id, "draft_writing", drafts)

        review = await _review_campaign(body, target_analysis, strategy, calendar, drafts)
        await _save_step(campaign_id, "review", review)

        final_calendar = review["finalCalendar"]
        posts_payload = []
        for raw in final_calendar:
            day = int(raw.get("day", len(posts_payload) + 1))
            draft = str(raw.get("draft", "")).strip()
            topic = str(raw.get("topic", "")).strip()
            hook = str(raw.get("hook", "")).strip()
            content = str(raw.get("content", "")).strip()
            if not hook or not content:
                hook, content = _split_hook_and_content(draft, topic)
            elif draft and _same_text(hook, content):
                _, content = _split_hook_and_content(draft, topic)
            content = _remove_repeated_hook(hook, content) or topic or body.one_line_description
            posts_payload.append({
                "project_id": project_id,
                "user_id": user_id,
                "platform": body.channel,
                "hook": hook,
                "content": content or topic or body.one_line_description,
                "hashtags": [],
                "tone": "friendly",
                "content_type": _post_content_type(raw.get("contentType")),
                "status": "draft",
                "scheduled_at": _scheduled_at_for_day(day),
                "ai_prompt": "2-week promotion campaign",
                "ai_model": MODEL,
                "campaign_id": campaign_id,
                "campaign_day": day,
                "campaign_meta": {
                    "contentType": raw.get("contentType", ""),
                    "postGoal": raw.get("postGoal", ""),
                    "topic": topic,
                    "hookStyle": raw.get("hookStyle", ""),
                    "coreMessage": raw.get("coreMessage", ""),
                    "cta": raw.get("cta", ""),
                    "assignedInfo": raw.get("assignedInfo", ""),
                },
            })

        posts_result = supabase.table("promotion_posts").insert(posts_payload).execute()
        posts = posts_result.data or []

        updated = supabase.table("promotion_campaigns").update({
            "status": "completed",
            "target_analysis": target_analysis,
            "campaign_strategy": strategy,
            "final_calendar": final_calendar,
            "post_ids": [p["id"] for p in posts],
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", campaign_id).execute()

        return {"campaign": updated.data[0] if updated.data else campaign, "posts": posts}
    except Exception as exc:
        supabase.table("promotion_campaigns").update({
            "status": "failed",
            "error_message": str(exc)[:1000],
        }).eq("id", campaign_id).execute()
        raise
