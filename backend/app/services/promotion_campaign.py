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
from app.services.promotion_options import PERSONA_OPTIONS, STRATEGY_OPTIONS
from app.workspace.skill_loader import get_skill_prompt

MODEL = "gemini-2.5-flash"
CAMPAIGN_DAYS = 14
DEFAULT_POST_HOUR = 19
SEOUL = ZoneInfo("Asia/Seoul")
PROMOTION_SKILL = get_skill_prompt("promotion")
THREADS_OPERATOR_CAMPAIGN_SKILL = get_skill_prompt("threads_operator_campaign")

DEFAULT_THREADS_RHYTHM = [
    {
        "day": 1,
        "postFormat": "product_intro",
        "rhythmRole": "제품과 계정의 정체성을 처음 분명히 알린다",
        "toneElements": ["명확함", "사람다움", "첫인사"],
        "ctaStrength": "medium",
        "usePlatformLanguage": False,
        "productMentionLevel": "clear",
    },
    {
        "day": 2,
        "postFormat": "operator_shortform",
        "rhythmRole": "제품을 알리는 일이 민망한 운영자의 혼잣말",
        "toneElements": ["민망함", "자조", "홍보 어색함"],
        "ctaStrength": "none",
        "usePlatformLanguage": False,
        "productMentionLevel": "implied",
    },
    {
        "day": 3,
        "postFormat": "community_question",
        "rhythmRole": "타겟 사용자를 직접 부르고 친구를 찾는다",
        "toneElements": ["외로움", "타겟 호출", "친목"],
        "ctaStrength": "low",
        "usePlatformLanguage": True,
        "productMentionLevel": "none",
    },
    {
        "day": 4,
        "postFormat": "product_request",
        "rhythmRole": "한 번 써봐달라고 솔직하게 부탁한다",
        "toneElements": ["부탁", "초기 사용자 찾기", "피드백 요청"],
        "ctaStrength": "high",
        "usePlatformLanguage": True,
        "productMentionLevel": "clear",
    },
    {
        "day": 5,
        "postFormat": "operator_shortform",
        "rhythmRole": "반응 없는 계정 운영의 현실을 짧게 보여준다",
        "toneElements": ["반응 없음", "자조", "계속 해보기"],
        "ctaStrength": "low",
        "usePlatformLanguage": True,
        "productMentionLevel": "implied",
    },
    {
        "day": 6,
        "postFormat": "operator_shortform",
        "rhythmRole": "제품 운영이 일상에 섞인 장면을 보여준다",
        "toneElements": ["생활감", "운영자 일상", "짧은 혼잣말"],
        "ctaStrength": "none",
        "usePlatformLanguage": False,
        "productMentionLevel": "implied",
    },
    {
        "day": 7,
        "postFormat": "proof_or_progress",
        "rhythmRole": "작은 운영 사실이나 작은 성취를 공유한다",
        "toneElements": ["작은 성취", "운영일지", "꾸준함"],
        "ctaStrength": "low",
        "usePlatformLanguage": False,
        "productMentionLevel": "implied",
    },
    {
        "day": 8,
        "postFormat": "product_request",
        "rhythmRole": "두 번째 제품 요청. 타겟에게 직접 써봐달라고 말한다",
        "toneElements": ["직접 요청", "피드백", "사람다운 부탁"],
        "ctaStrength": "high",
        "usePlatformLanguage": False,
        "productMentionLevel": "clear",
    },
    {
        "day": 9,
        "postFormat": "operator_shortform",
        "rhythmRole": "제품을 만든 이유보다 알리는 일이 어렵다는 감정을 보여준다",
        "toneElements": ["힘듦", "마케팅 어려움", "솔직함"],
        "ctaStrength": "none",
        "usePlatformLanguage": False,
        "productMentionLevel": "implied",
    },
    {
        "day": 10,
        "postFormat": "community_question",
        "rhythmRole": "댓글 허들이 낮은 질문으로 대화를 만든다",
        "toneElements": ["쉬운 질문", "스친 찾기", "공감"],
        "ctaStrength": "low",
        "usePlatformLanguage": True,
        "productMentionLevel": "none",
    },
    {
        "day": 11,
        "postFormat": "soft_feature",
        "rhythmRole": "기능을 기능표가 아니라 실제 상황 속에서 살짝 보여준다",
        "toneElements": ["상황 기반", "짧은 기능 노출", "실용성"],
        "ctaStrength": "medium",
        "usePlatformLanguage": False,
        "productMentionLevel": "clear",
    },
    {
        "day": 12,
        "postFormat": "product_request",
        "rhythmRole": "세 번째 제품 요청. 피드백과 사용을 구체적으로 부탁한다",
        "toneElements": ["간절함", "피드백 요청", "초기 운영자"],
        "ctaStrength": "high",
        "usePlatformLanguage": False,
        "productMentionLevel": "clear",
    },
    {
        "day": 13,
        "postFormat": "operator_shortform",
        "rhythmRole": "계정 성장이나 맞팔 문화에 기대는 가벼운 친목 글",
        "toneElements": ["구걸", "친목", "살짝 처절함"],
        "ctaStrength": "medium",
        "usePlatformLanguage": True,
        "productMentionLevel": "implied",
    },
    {
        "day": 14,
        "postFormat": "operator_shortform",
        "rhythmRole": "계속 이어지는 운영 흐름 속에서 짧은 생각이나 질문을 남긴다",
        "toneElements": ["계속 운영", "짧은 생각", "대화 여지"],
        "ctaStrength": "low",
        "usePlatformLanguage": False,
        "productMentionLevel": "implied",
    },
]

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
    "운영자 숏폼형": "qa",
    "제품 요청형": "launch",
    "제품 소개형": "launch",
    "정보/기능형": "tip",
    "커뮤니티 질문형": "qa",
    "부드러운 기능형": "update",
    "운영일지/작은 성취형": "milestone",
}


def _input_dict(body: PromotionCampaignRequest) -> dict:
    return body.model_dump()


def _option_by_id(options: list[dict], option_id: str, label: str) -> dict:
    for option in options:
        if option.get("id") == option_id:
            return option
    raise ValidationError(f"Unknown {label}: {option_id}")


def _evaluation_by_id(evaluations: list[dict] | None, option_id: str) -> dict:
    if not isinstance(evaluations, list):
        return {}
    for evaluation in evaluations:
        if isinstance(evaluation, dict) and evaluation.get("optionId") == option_id:
            return evaluation
    return {}


def _common_context(body: PromotionCampaignRequest) -> str:
    return f"""
Project name: {body.project_name}
One-line description: {body.one_line_description}
Project link: {body.project_url or "N/A"}
Expected target user: {body.target_user}
Problem to solve: {body.problem}
Core value: {body.core_value}
Main features: {body.main_features}
Promotion goal: {body.promotion_goal}
Channel: {body.channel}
Tone preference: {body.tone_preference}
Additional context: {body.additional_context or "N/A"}
"""


def _campaign_body_from_input(value: object) -> PromotionCampaignRequest:
    if not isinstance(value, dict):
        raise ValidationError("Campaign input is missing")
    return PromotionCampaignRequest(**value)


def _ensure_dict(value: object, step: str) -> dict:
    if not isinstance(value, dict):
        raise ExternalAPIError("Gemini", f"{step} returned non-object JSON")
    return value


def _ensure_list(value: object, step: str) -> list:
    if not isinstance(value, list):
        raise ExternalAPIError("Gemini", f"{step} returned non-array JSON")
    return value


def _fallback_rhythm_item(day: int) -> dict:
    return next(
        (item.copy() for item in DEFAULT_THREADS_RHYTHM if item["day"] == day),
        {
            "day": day,
            "postFormat": "operator_shortform",
            "rhythmRole": "운영자의 사람다운 짧은 글",
            "toneElements": ["사람다움", "짧은 혼잣말"],
            "ctaStrength": "low",
            "usePlatformLanguage": False,
            "productMentionLevel": "implied",
        },
    )


def _normalize_rhythm_item(item: dict, day: int) -> dict:
    allowed_formats = {
        "product_intro",
        "operator_shortform",
        "product_request",
        "community_question",
        "soft_feature",
        "proof_or_progress",
    }
    allowed_cta = {"none", "low", "medium", "high"}
    allowed_mentions = {"none", "implied", "clear"}
    fallback = _fallback_rhythm_item(day)

    post_format = item.get("postFormat") if isinstance(item.get("postFormat"), str) else ""
    cta_strength = item.get("ctaStrength") if isinstance(item.get("ctaStrength"), str) else ""
    mention_level = item.get("productMentionLevel") if isinstance(item.get("productMentionLevel"), str) else ""

    tone_elements = item.get("toneElements")
    if not isinstance(tone_elements, list) or not tone_elements:
        tone_elements = fallback["toneElements"]

    return {
        **fallback,
        **item,
        "day": day,
        "postFormat": post_format if post_format in allowed_formats else fallback["postFormat"],
        "rhythmRole": item.get("rhythmRole") or fallback["rhythmRole"],
        "toneElements": tone_elements,
        "ctaStrength": cta_strength if cta_strength in allowed_cta else fallback["ctaStrength"],
        "usePlatformLanguage": bool(item.get("usePlatformLanguage", fallback["usePlatformLanguage"])),
        "productMentionLevel": mention_level if mention_level in allowed_mentions else fallback["productMentionLevel"],
    }


def _normalize_operating_rhythm(rhythm: dict) -> dict:
    """Let strategy shape the rhythm, then enforce only the safety rails."""
    raw_items = rhythm.get("calendarRhythm")
    if not isinstance(raw_items, list):
        raw_items = []
    raw_by_day = {
        int(item.get("day", 0)): item
        for item in raw_items
        if isinstance(item, dict)
    }

    items = [_normalize_rhythm_item(raw_by_day.get(day, {}), day) for day in range(1, CAMPAIGN_DAYS + 1)]

    # Hard boundary: first post must identify the finished product.
    items[0] = {
        **items[0],
        "postFormat": "product_intro",
        "ctaStrength": "medium" if items[0].get("ctaStrength") == "high" else items[0].get("ctaStrength", "medium"),
        "usePlatformLanguage": False,
        "productMentionLevel": "clear",
    }

    # Keep hard product asks present but not overwhelming.
    product_request_days = [item["day"] for item in items if item["postFormat"] == "product_request"]
    for day in [4, 8, 12]:
        if len(product_request_days) >= 3:
            break
        idx = day - 1
        if items[idx]["postFormat"] != "product_intro":
            items[idx] = {
                **items[idx],
                "postFormat": "product_request",
                "rhythmRole": items[idx].get("rhythmRole") or "제품 사용과 피드백을 직접 부탁한다",
                "ctaStrength": "high",
                "productMentionLevel": "clear",
            }
            product_request_days.append(day)

    if len(product_request_days) > 4:
        keep = set(product_request_days[:4])
        for item in items:
            if item["postFormat"] == "product_request" and item["day"] not in keep:
                item["postFormat"] = "operator_shortform"
                item["ctaStrength"] = "low"
                item["productMentionLevel"] = "implied"

    operator_formats = {"operator_shortform", "community_question", "proof_or_progress"}
    operator_count = sum(1 for item in items if item["postFormat"] in operator_formats)
    if operator_count < 8:
        for item in items[1:]:
            if operator_count >= 8:
                break
            if item["postFormat"] in {"soft_feature"}:
                item["postFormat"] = "operator_shortform"
                item["ctaStrength"] = "low"
                item["productMentionLevel"] = "implied"
                operator_count += 1

    platform_days = [item["day"] for item in items if item["usePlatformLanguage"]]
    if len(platform_days) < 3:
        for day in [3, 5, 10, 13]:
            if len(platform_days) >= 3:
                break
            item = items[day - 1]
            if item["postFormat"] != "product_intro" and not item["usePlatformLanguage"]:
                item["usePlatformLanguage"] = True
                platform_days.append(day)
    elif len(platform_days) > 6:
        keep = set(platform_days[:6])
        for item in items:
            item["usePlatformLanguage"] = item["day"] in keep

    direct_mentions = [item["day"] for item in items if item["productMentionLevel"] == "clear"]
    if len(direct_mentions) > 6:
        keep = set(direct_mentions[:6])
        for item in items:
            if item["day"] not in keep and item["productMentionLevel"] == "clear":
                item["productMentionLevel"] = "implied"

    rhythm["calendarRhythm"] = items
    rhythm["productRequestDays"] = [item["day"] for item in items if item["postFormat"] == "product_request"]
    rhythm["platformLanguageDays"] = [item["day"] for item in items if item["usePlatformLanguage"]]
    rhythm["directProductMentionDays"] = [item["day"] for item in items if item["productMentionLevel"] == "clear"]
    rhythm["normalizationRulesApplied"] = [
        "day_1_product_intro",
        "product_request_count_3_to_4",
        "operator_led_count_at_least_8",
        "platform_language_count_3_to_6",
        "direct_product_mentions_at_most_6",
    ]
    return rhythm


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


async def _evaluate_strategy_options(body: PromotionCampaignRequest, target_analysis: dict, selected_persona: dict) -> dict:
    prompt = f"""
You are a Threads campaign strategist.

Evaluate the fixed strategy options for this project and selected persona. Do not create new options.
Write very short Korean comments for compact selection cards.

Input:
{_common_context(body)}

Target analysis:
{target_analysis}

Selected persona:
{selected_persona}

Fixed strategy options:
{STRATEGY_OPTIONS}

Return only JSON:
{{
  "evaluations": [
    {{
      "optionId": "daily_presence",
      "reason": "이 프로젝트와 선택된 페르소나에 이 전략이 맞는 이유",
      "caution": "선택 시 주의할 점"
    }}
  ]
}}

Rules:
- Include exactly one evaluation for every fixed strategy option.
- Do not include fitScore or numeric ranking.
- Do not invent option IDs.
- Keep reason within 70 Korean characters.
- Keep caution within 45 Korean characters.
- Each field should be one short sentence.
- Use Korean only.
"""
    result = await gemini.generate_json(
        prompt=prompt,
        system="Evaluate fixed strategy options for a project. Do not create new options.",
        model=MODEL,
    )
    evaluation = _ensure_dict(result, "strategy_option_evaluation")
    if not isinstance(evaluation.get("evaluations"), list):
        raise ExternalAPIError("Gemini", "strategy_option_evaluation did not return evaluations")
    return evaluation


def _strategy_from_selection(
    body: PromotionCampaignRequest,
    selected_persona: dict,
    selected_strategy: dict,
    strategy_evaluation: dict,
) -> dict:
    return {
        "goal": body.promotion_goal,
        "duration": "14 days",
        "overallMood": selected_persona.get("tone", body.tone_preference),
        "contentPrinciple": (
            "Use the fixed selected persona and selected strategy as the campaign direction. "
            "Do not invent a new strategy."
        ),
        "operatorPersona": selected_persona,
        "selectedPersona": selected_persona,
        "selectedStrategy": selected_strategy,
        "strategyEvaluation": strategy_evaluation,
        "finishedProductBoundary": (
            "The product already exists enough to promote. Do not write as if it is an unbuilt MVP."
        ),
        "rhythmStrategy": {
            "strategyName": selected_strategy.get("id", ""),
            "whyThisRhythm": strategy_evaluation.get("reason") or selected_strategy.get("description", ""),
            "shortformEmphasis": selected_persona.get("description", ""),
            "productRequestApproach": selected_strategy.get("mainGoal", ""),
            "communityApproach": (
                "Use Threads-native community language only when it matches the selected persona and strategy."
            ),
        },
        "avoidRules": selected_persona.get("avoid", []) + selected_strategy.get("risks", []),
        "contentMix": [
            {"contentType": "운영자 숏폼형", "count": 9},
            {"contentType": "제품 요청형", "count": 3},
            {"contentType": "제품 소개형", "count": 1},
            {"contentType": "정보/기능형", "count": 1},
        ],
    }


async def _campaign_strategy(body: PromotionCampaignRequest, target_analysis: dict) -> dict:
    prompt = f"""
You are a campaign strategist for finished SaaS/product promotion.

Create a 14-day Threads campaign strategy for a finished product.
Do not write as if the product is unbuilt, still only an idea, or being built from scratch.
However, the campaign should use operator-led short posts where the human behind the product is visible.
The operator may talk about promotion struggles, low engagement, asking for feedback, finding users,
awkwardness, small wins, and running an already-finished product.

Input:
{_common_context(body)}

Target analysis:
{target_analysis}

Threads operator campaign rules:
{THREADS_OPERATOR_CAMPAIGN_SKILL or "No Threads operator campaign document is available. Still prioritize human operator-led Threads posts."}

Content type options:
- 제품 소개형
- 운영자 숏폼형
- 제품 요청형
- 커뮤니티 질문형
- 부드러운 기능형
- 운영일지/작은 성취형

Return only JSON:
{{
  "goal": "campaign goal",
  "duration": "14 days",
  "overallMood": "overall mood",
  "contentPrinciple": "one guiding principle for finished-product operator-led Threads promotion",
  "operatorPersona": "human operator persona for this product account",
  "finishedProductBoundary": "how to avoid unbuilt/build-from-zero framing",
  "rhythmStrategy": {{
    "strategyName": "short name for the rhythm that fits this product",
    "whyThisRhythm": "why this rhythm fits the product, target, and promotion goal",
    "shortformEmphasis": "which human/operator situations should appear often",
    "productRequestApproach": "how direct product asks should feel",
    "communityApproach": "how to use 스친/스하리/반하리 naturally"
  }},
  "avoidRules": ["rule", "..."],
  "contentMix": [
    {{"contentType": "운영자 숏폼형", "count": 9}},
    {{"contentType": "제품 요청형", "count": 3}},
    {{"contentType": "제품 소개형", "count": 1}},
    {{"contentType": "정보/기능형", "count": 1}}
  ]
}}
"""
    result = await gemini.generate_json(prompt=prompt, system="Plan varied product promotion campaigns. Avoid repetitive sales copy.", model=MODEL)
    return _ensure_dict(result, "campaign_strategy")


async def _threads_operating_rhythm(body: PromotionCampaignRequest, target_analysis: dict, strategy: dict) -> dict:
    prompt = f"""
You are a Threads-native editorial rhythm planner.

Create the operating rhythm for a 14-day campaign before any final post drafts are written.
The 14 days are only an internal generation batch in LaunchPad, not a public campaign period.
Never make Day 14 a closing, recap, goodbye, wrap-up, or "two weeks are over" post.
This product is already finished enough to promote. Do not frame it as an unbuilt MVP or future idea.
Use the campaign strategy's rhythmStrategy to choose the day-by-day flow.
Do not copy the fallback rhythm mechanically. It is only a safety reference for shape and pacing.

Input:
{_common_context(body)}

Target analysis:
{target_analysis}

Campaign strategy:
{strategy}

Fallback rhythm example:
{DEFAULT_THREADS_RHYTHM}

Threads operator campaign rules:
{THREADS_OPERATOR_CAMPAIGN_SKILL or "No Threads operator campaign document is available. Follow operator-led shortform principles."}

Return only JSON:
{{
  "operatorPersona": "specific account operator persona",
  "voicePrinciples": ["short practical rule", "..."],
  "rhythmStrategyUsed": "how you interpreted the campaign strategy into the 14-day rhythm",
  "productRequestDays": [4, 8, 12],
  "platformLanguageDays": [3, 6, 10, 13],
  "directProductMentionDays": [1, 4, 8, 12],
  "calendarRhythm": [
    {{
      "day": 1,
      "postFormat": "product_intro",
      "rhythmRole": "why this day exists in the 14-day flow",
      "toneElements": ["clear", "human"],
      "ctaStrength": "medium",
      "usePlatformLanguage": false,
      "productMentionLevel": "clear"
    }}
  ],
  "reviewChecklist": ["rule to verify at the end", "..."]
}}

Rules for calendarRhythm:
- It must contain exactly 14 objects.
- Day 1 must be postFormat "product_intro".
- Choose day 2-14 postFormat based on the campaign strategy.
- Day 14 must feel like a normal ongoing account post, not the end of anything.
- Include 3-4 product_request posts total, spaced roughly every 3-4 days.
- Include at least 8 operator-led posts using operator_shortform, community_question, or proof_or_progress.
- Include 3-6 days where usePlatformLanguage is true.
- Keep direct product mentions to 4-6 days total.
- Use postFormat values only from:
  product_intro, operator_shortform, product_request, community_question, soft_feature, proof_or_progress.
- Do not make every day a hard CTA.
- Do not mention internal generation windows or endings: "지난 2주", "2주 캠페인", "14일간의 여정", "마무리", "마지막", "끝났어요", "종료".
"""
    result = await gemini.generate_json(prompt=prompt, system="Plan Threads editorial rhythm for human operator-led finished-product campaigns.", model=MODEL)
    rhythm = _ensure_dict(result, "threads_operating_rhythm")
    calendar_rhythm = rhythm.get("calendarRhythm")
    if not isinstance(calendar_rhythm, list) or len(calendar_rhythm) != CAMPAIGN_DAYS:
        raise ExternalAPIError("Gemini", "threads_operating_rhythm did not return exactly 14 calendarRhythm items")
    return _normalize_operating_rhythm(rhythm)


async def _calendar_plan(body: PromotionCampaignRequest, target_analysis: dict, strategy: dict, operating_rhythm: dict) -> list:
    prompt = f"""
You are a 14-day SNS editorial calendar planner.

Plan exactly 14 different Threads posts. Do not write final drafts yet.
The 14 posts are only an internal generation batch in LaunchPad.
Readers must not see references to a 14-day or two-week campaign.
Each day must have a different topic angle, hook style, and message.
Do not repeat the same product benefit every day.
Follow the operating rhythm exactly for postFormat, CTA strength, platform-language usage, and product mention level.
Day 1 must introduce the product clearly.
The campaign should not pretend the product is unbuilt or still being made from scratch.
Day 14 must not be a closing, recap, wrap-up, goodbye, or final campaign post.

Input:
{_common_context(body)}

Target analysis:
{target_analysis}

Campaign strategy:
{strategy}

Threads operating rhythm:
{operating_rhythm}

Threads operator campaign rules:
{THREADS_OPERATOR_CAMPAIGN_SKILL or "No Threads operator campaign document is available. Follow operator-led shortform principles."}

Return only a JSON array with exactly 14 objects:
[
  {{
    "day": 1,
    "postFormat": "product_intro",
    "contentType": "제품 소개형",
    "postGoal": "what this post should achieve",
    "topic": "specific topic",
    "hookStyle": "specific hook technique",
    "coreMessage": "one core message",
    "cta": "clear CTA",
    "assignedInfo": "which input/context this post uses",
    "toneElements": ["human tone element", "..."],
    "ctaStrength": "none | low | medium | high",
    "usePlatformLanguage": false,
    "productMentionLevel": "none | implied | clear"
  }}
]

Rules:
- Do not use topics, postGoals, hookStyles, coreMessages, or CTAs about ending or wrapping up the campaign.
- Forbidden phrases: "지난 2주", "2주 캠페인", "14일간의 여정", "마무리", "마지막", "끝났어요", "종료".
- Day 14 should be another ongoing operator post, question, soft product request, small operating moment, or insight.
"""
    result = await gemini.generate_json(prompt=prompt, system="Create non-overlapping content calendars for product marketing.", model=MODEL)
    plan = _ensure_list(result, "calendar_planning")
    if len(plan) != CAMPAIGN_DAYS:
        raise ExternalAPIError("Gemini", f"calendar_planning returned {len(plan)} items, expected 14")
    return plan


async def _draft_posts(body: PromotionCampaignRequest, target_analysis: dict, strategy: dict, operating_rhythm: dict, calendar: list) -> list:
    prompt = f"""
You are a Threads copywriter for finished-product operator-led promotion.

Write actual post drafts for the 14-day calendar.
The 14 days are only an internal generation batch in LaunchPad.
Do not reveal the batch length or write as if promotion stops after these posts.

Promotion writing reference:
{PROMOTION_SKILL or "No promotion skill document is available. Follow the rules below."}

Use the promotion writing reference only for product_intro, product_request, and soft_feature posts.
For operator_shortform, community_question, and proof_or_progress posts, ignore the 5-Part Arc and prioritize the Threads operator campaign rules.

Threads operator campaign rules:
{THREADS_OPERATOR_CAMPAIGN_SKILL or "No Threads operator campaign document is available. Follow the rules below."}

Rules:
- Korean by default unless the input clearly asks otherwise.
- Threads tone: conversational, concrete, community-aware.
- Each draft must be 500 characters or less.
- Follow each day's postFormat, toneElements, ctaStrength, usePlatformLanguage, and productMentionLevel.
- Day 1 must clearly introduce the product.
- Day 14 must sound like the account will keep operating, not like a closing post.
- Product request posts must ask directly but sound like a human operator asking, not an ad.
- Operator shortform posts should lead with human feeling, operating situation, low engagement, awkwardness, small wins, or community-seeking before product explanation.
- Use 스친, 스하리, 반하리, 맞팔, 뒷삭 only on days where usePlatformLanguage is true.
- Do not use emojis unless they are very natural and sparse.
- Do not sound like an ad.
- Do not use advertising phrases like "지금 바로", "확인해보세요", "경험해보세요", "무료로 체험", "마법", "꿀팁", "심폐소생술", "새 생명", "알아서 척척", "더 이상".
- Do not use cliches like "혁신적인", "최고의", "생산성을 극대화", "게임 체인저".
- Do not write as if the product is unbuilt, still just an idea, or being built from scratch.
- Do not mention internal generation windows or endings: "지난 2주", "2주 캠페인", "14일간의 여정", "마무리", "마지막", "끝났어요", "종료".
- You may write operator-led posts about running, promoting, asking for feedback, and finding users for an already-finished product.
- Start from realistic situations the target user faces.
- Do not write polished educational posts, checklist posts, fake testimonials, or corporate campaign copy unless the day's postFormat explicitly asks for it.
- Do not end every post with a product CTA.
- Mention the product name only when productMentionLevel is "clear"; otherwise imply the context without naming it.
- Do not write URLs directly in the hook, content, or draft. The system attaches the project link only to selected CTA-role posts.
- If a post needs a CTA, write the human request text only.

Format-specific rules:
- product_intro: introduce product name, who it is for, and what it does. Keep it human, not corporate.
- operator_shortform: 2-6 short lines. No feature list. No formal CTA. It should feel like the operator posted a thought.
- community_question: call a specific group and ask one easy question. Use platform language if allowed.
- product_request: ask people to try it or give feedback. It can feel a bit desperate, but never like a landing-page CTA.
- soft_feature: show one feature through one realistic moment. Do not list multiple features.
- proof_or_progress: share one small operating fact, tiny win, or honest status.

Bad style example:
"IndieOps의 핵심 가치를 지금 바로 확인해보세요."

Good style example:
"이거 한 번만 써봐줄 사람 있나...

아직 큰 말은 못하겠고
진짜 필요한 사람한테 맞는지만 보고 싶음"

Line break and readability rules:
- Write in a Threads-native layout, not as a dense paragraph.
- Use frequent line breaks and blank lines like the reference posts in docs/promotion.
- Split each post into 3-6 short visual blocks.
- Each block should be 1-2 short sentences.
- Put the hook as its own first line.
- Separate situation, problem, product/solution, proof/example, and CTA with blank lines.
- If listing target users, benefits, examples, or steps, use numbered lines or bullet lines.
- Put the final question or CTA in its own final block.
- Avoid one long paragraph. Do not return content as a single dense block.

Input:
{_common_context(body)}

Target analysis:
{target_analysis}

Campaign strategy:
{strategy}

Threads operating rhythm:
{operating_rhythm}

Calendar:
{calendar}

Return only a JSON array with exactly 14 objects:
[
  {{
    "day": 1,
    "hook": "opening hook as one short standalone line",
    "content": "body text with frequent line breaks and blank lines, without repeating the hook",
    "draft": "hook + blank line + content"
  }}
]
"""
    result = await gemini.generate_json(prompt=prompt, system="Write natural, non-salesy Threads drafts for product promotion.", model=MODEL)
    drafts = _ensure_list(result, "draft_writing")
    if len(drafts) != CAMPAIGN_DAYS:
        raise ExternalAPIError("Gemini", f"draft_writing returned {len(drafts)} items, expected 14")
    return drafts


async def _review_campaign(body: PromotionCampaignRequest, target_analysis: dict, strategy: dict, operating_rhythm: dict, calendar: list, drafts: list) -> dict:
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
You are the final editor for a 14-day finished-product Threads operator campaign.

Review and revise the campaign so it passes all rules.
The 14 days are only an internal generation batch in LaunchPad, not a public campaign period.

Input:
{_common_context(body)}

Target analysis:
{target_analysis}

Campaign strategy:
{strategy}

Threads operating rhythm:
{operating_rhythm}

Threads operator campaign rules:
{THREADS_OPERATOR_CAMPAIGN_SKILL or "No Threads operator campaign document is available. Follow operator-led shortform principles."}

Draft calendar:
{merged}

Review rules:
- Same message must not repeat.
- Not every post can say "our service is good".
- Do not repeat feature introductions.
- Each post should use a different hook style or content type.
- Avoid ad-like expressions.
- Remove advertising phrases like "지금 바로", "확인해보세요", "경험해보세요", "무료로 체험", "마법", "꿀팁", "심폐소생술", "새 생명", "알아서 척척", "더 이상".
- Avoid "혁신적인", "최고의", "생산성을 극대화", "게임 체인저".
- Start from realistic target-user situations.
- CTA strength must match each post's role. Not every post needs a hard CTA.
- Keep Threads length and tone.
- Do not write as if the product is unbuilt or still being made from scratch.
- Do not mention internal generation windows or endings: "지난 2주", "2주 캠페인", "14일간의 여정", "마무리", "마지막", "끝났어요", "종료".
- Remove any URLs from final copy. The system attaches the project link only to selected CTA-role posts.
- CTA posts should contain the human request text, not the raw link.
- Preserve operator-led human posts about running, promoting, finding users, getting feedback, awkwardness, low engagement, and small wins.
- Day 1 must clearly introduce the product.
- Day 14 must be rewritten if it sounds like a closing, recap, wrap-up, goodbye, final promise, or "campaign is over" post.
- Day 14 should feel like one normal ongoing account post that could naturally be followed by Day 15.
- Across the 14 posts, 9-10 should feel like operator-led shortform posts.
- Across the 14 posts, 3-4 should be product request posts, spaced roughly every 3-4 posts.
- Threads culture terms like 스친, 스하리, 반하리, 맞팔, 뒷삭 should appear in 3-6 posts only.
- Product request posts should sound like human requests, not corporate ad copy.
- Operator shortform posts must not contain feature lists, fake testimonials, educational article structure, or landing-page CTA endings.
- If a post sounds like a polished campaign ad, rewrite it as a short operator post even if the meaning becomes less comprehensive.

Threads formatting review rules:
- Rewrite each final post so it reads like real Threads reference posts from docs/promotion.
- Preserve the meaning, campaign day, CTA, and product facts.
- Do not compress the body into one paragraph.
- Ensure each post has frequent line breaks and blank lines.
- The hook must be a standalone first line and must not be repeated in content.
- Split content into 3-6 short visual blocks.
- Each visual block should contain 1-2 short sentences at most.
- Separate these parts with blank lines when present:
  1. situation or pain
  2. personal/context line
  3. product or solution
  4. concrete example/proof
  5. soft CTA/question
- If there are 3 or more examples, target users, benefits, or steps, format them as numbered or bullet lines.
- Put the CTA/question as the final standalone block.
- Avoid corporate, essay-like, newsletter-like, or ad-like formatting.
- A post with no blank lines should fail review unless it is intentionally shorter than 3 lines.

Return only JSON:
{{
  "passed": true,
  "issues": [
    {{"day": 3, "issue": "what was fixed"}}
  ],
  "finalCalendar": [
    {{
      "day": 1,
      "postFormat": "product_intro",
      "contentType": "제품 소개형",
      "postGoal": "",
      "topic": "",
      "hookStyle": "",
      "coreMessage": "",
      "cta": "",
      "assignedInfo": "",
      "toneElements": ["human tone element", "..."],
      "ctaStrength": "none | low | medium | high",
      "usePlatformLanguage": false,
      "productMentionLevel": "none | implied | clear",
      "hook": "standalone first line, not repeated in content",
      "content": "formatted body with blank lines and short Threads-style blocks",
      "draft": "hook + blank line + content"
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


URL_PATTERN = re.compile(r"(?:https?://|www\.)\S+", re.IGNORECASE)


def _remove_urls(value: str) -> str:
    cleaned = URL_PATTERN.sub("", value).strip()
    cleaned = re.sub(r"[ \t]+\n", "\n", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned


def _campaign_project_url(body: PromotionCampaignRequest) -> str:
    url = (body.project_url or "").strip()
    if not url:
        return ""
    if not re.match(r"^https?://", url, re.IGNORECASE):
        return f"https://{url}"
    return url


def _campaign_link_rule(raw: dict, day: int) -> str:
    post_format = str(raw.get("postFormat", "")).strip().lower()
    cta_strength = str(raw.get("ctaStrength", "")).strip().lower()
    if day == 1 and post_format == "product_intro":
        return "day1_product_intro"
    if post_format == "product_request":
        return "product_request"
    if cta_strength == "high":
        return "high_cta"
    return ""


def _campaign_post_link(body: PromotionCampaignRequest, raw: dict, day: int) -> str | None:
    url = _campaign_project_url(body)
    if not url:
        return None
    return url if _campaign_link_rule(raw, day) else None


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


def _format_threads_content(content: str) -> str:
    """Add Threads-style breathing room when the model returns dense text."""
    cleaned = content.strip()
    if not cleaned:
        return cleaned

    non_empty_lines = [line.strip() for line in cleaned.splitlines() if line.strip()]
    if len(non_empty_lines) >= 3 and "\n\n" in cleaned:
        return cleaned

    list_pattern = re.compile(r"(?=(?:\d+[\.)]|[-*])\s+)")
    if list_pattern.search(cleaned):
        cleaned = list_pattern.sub("\n", cleaned)

    sentences = re.split(r"(?<=[.!?。！？]|[다요죠까네])\s+", cleaned)
    sentences = [sentence.strip() for sentence in sentences if sentence.strip()]
    if len(sentences) <= 2:
        return "\n\n".join(non_empty_lines) if len(non_empty_lines) > 1 else cleaned

    blocks: list[str] = []
    current: list[str] = []
    cta_markers = ("?", "까요", "주세요", "어때", "어떻게 생각", "댓글", "확인", "써보", "알려")

    for sentence in sentences:
        is_cta = any(marker in sentence for marker in cta_markers)
        if is_cta and current:
            blocks.append(" ".join(current))
            current = []
        current.append(sentence)
        if is_cta or len(current) == 2:
            blocks.append(" ".join(current))
            current = []

    if current:
        blocks.append(" ".join(current))

    return "\n\n".join(blocks)


def _scheduled_at_for_day(day: int) -> str:
    now = datetime.now(SEOUL)
    target = (now + timedelta(days=day)).replace(
        hour=DEFAULT_POST_HOUR,
        minute=0,
        second=0,
        microsecond=0,
    )
    return target.isoformat()


def _get_campaign_for_user(project_id: str, user_id: str, campaign_id: str) -> dict:
    result = (
        supabase.table("promotion_campaigns")
        .select("*")
        .eq("id", campaign_id)
        .eq("project_id", project_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise ValidationError("Campaign not found")
    return result.data


async def start_campaign_wizard(project_id: str, user_id: str, body: PromotionCampaignRequest) -> dict:
    """Start the guided strategy proposal flow and return fixed persona options."""
    campaign_insert = supabase.table("promotion_campaigns").insert({
        "project_id": project_id,
        "user_id": user_id,
        "input": _input_dict(body),
        "status": "awaiting_persona_selection",
    }).execute()
    if not campaign_insert.data:
        raise ValidationError("Failed to create promotion campaign")

    campaign = campaign_insert.data[0]
    campaign_id = campaign["id"]

    try:
        target_analysis = await _target_analysis(body)
        await _save_step(campaign_id, "target_analysis", target_analysis)

        campaign_strategy = {
            "personaOptions": PERSONA_OPTIONS,
        }
        updated = supabase.table("promotion_campaigns").update({
            "target_analysis": target_analysis,
            "campaign_strategy": campaign_strategy,
            "status": "awaiting_persona_selection",
        }).eq("id", campaign_id).execute()

        return {
            "campaign": updated.data[0] if updated.data else campaign,
            "personaOptions": PERSONA_OPTIONS,
        }
    except Exception as exc:
        supabase.table("promotion_campaigns").update({
            "status": "failed",
            "error_message": str(exc)[:1000],
        }).eq("id", campaign_id).execute()
        raise


async def select_campaign_persona(project_id: str, user_id: str, campaign_id: str, persona_id: str) -> dict:
    """Persist the selected persona and return strategy option evaluations."""
    campaign = _get_campaign_for_user(project_id, user_id, campaign_id)
    body = _campaign_body_from_input(campaign.get("input"))
    target_analysis = campaign.get("target_analysis") or {}
    campaign_strategy = campaign.get("campaign_strategy") or {}

    selected_persona = _option_by_id(PERSONA_OPTIONS, persona_id, "persona")

    await _save_step(campaign_id, "user_persona_selection", {
        "selectedPersonaId": persona_id,
        "selectedPersona": selected_persona,
    })

    strategy_evaluation = await _evaluate_strategy_options(body, target_analysis, selected_persona)
    strategy_step = {
        "selectedPersona": selected_persona,
        "options": STRATEGY_OPTIONS,
        **strategy_evaluation,
    }
    await _save_step(campaign_id, "strategy_option_evaluation", strategy_step)

    updated_strategy = {
        **campaign_strategy,
        "selectedPersona": selected_persona,
        "selectedPersonaId": persona_id,
        "strategyOptions": STRATEGY_OPTIONS,
        "strategyEvaluation": strategy_evaluation.get("evaluations", []),
    }
    updated = supabase.table("promotion_campaigns").update({
        "campaign_strategy": updated_strategy,
        "status": "awaiting_strategy_selection",
    }).eq("id", campaign_id).execute()

    return {
        "campaign": updated.data[0] if updated.data else campaign,
        "selectedPersona": selected_persona,
        "strategyOptions": STRATEGY_OPTIONS,
        "strategyEvaluation": strategy_evaluation.get("evaluations", []),
    }


async def select_campaign_strategy(project_id: str, user_id: str, campaign_id: str, strategy_id: str) -> dict:
    """Persist the selected strategy, then generate and save the 14-day campaign."""
    campaign = _get_campaign_for_user(project_id, user_id, campaign_id)
    body = _campaign_body_from_input(campaign.get("input"))
    target_analysis = campaign.get("target_analysis") or {}
    campaign_strategy = campaign.get("campaign_strategy") or {}

    selected_persona = campaign_strategy.get("selectedPersona")
    if not isinstance(selected_persona, dict):
        raise ValidationError("Select a persona before selecting strategy")

    selected_strategy = _option_by_id(STRATEGY_OPTIONS, strategy_id, "strategy")
    strategy_evaluation = _evaluation_by_id(campaign_strategy.get("strategyEvaluation"), strategy_id)
    strategy = _strategy_from_selection(
        body,
        selected_persona,
        selected_strategy,
        strategy_evaluation,
    )

    await _save_step(campaign_id, "user_strategy_selection", {
        "selectedStrategyId": strategy_id,
        "selectedStrategy": selected_strategy,
        "strategyEvaluation": strategy_evaluation,
    })

    try:
        supabase.table("promotion_campaigns").update({
            "status": "generating",
            "campaign_strategy": {
                **campaign_strategy,
                **strategy,
            },
        }).eq("id", campaign_id).execute()

        operating_rhythm = await _threads_operating_rhythm(body, target_analysis, strategy)
        await _save_step(campaign_id, "threads_operating_rhythm", operating_rhythm)

        calendar = await _calendar_plan(body, target_analysis, strategy, operating_rhythm)
        await _save_step(campaign_id, "calendar_planning", calendar)

        drafts = await _draft_posts(body, target_analysis, strategy, operating_rhythm, calendar)
        await _save_step(campaign_id, "draft_writing", drafts)

        review = await _review_campaign(body, target_analysis, strategy, operating_rhythm, calendar, drafts)
        await _save_step(campaign_id, "review", review)

        final_calendar = review["finalCalendar"]
        posts = _insert_campaign_posts(project_id, user_id, body, campaign_id, final_calendar)

        final_strategy = {
            **campaign_strategy,
            **strategy,
            "threadsOperatingRhythm": operating_rhythm,
        }
        updated = supabase.table("promotion_campaigns").update({
            "status": "completed",
            "target_analysis": target_analysis,
            "campaign_strategy": final_strategy,
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


def _insert_campaign_posts(project_id: str, user_id: str, body: PromotionCampaignRequest, campaign_id: str, final_calendar: list) -> list:
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
        hook = _remove_urls(hook)
        content = _remove_repeated_hook(hook, content) or topic or body.one_line_description
        content = _remove_urls(content)
        content = _format_threads_content(content)
        link = _campaign_post_link(body, raw, day)
        link_rule = _campaign_link_rule(raw, day)
        posts_payload.append({
            "project_id": project_id,
            "user_id": user_id,
            "platform": body.channel,
            "hook": hook,
            "content": content or topic or body.one_line_description,
            "link": link,
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
                "postFormat": raw.get("postFormat", ""),
                "contentType": raw.get("contentType", ""),
                "postGoal": raw.get("postGoal", ""),
                "topic": topic,
                "hookStyle": raw.get("hookStyle", ""),
                "coreMessage": raw.get("coreMessage", ""),
                "cta": raw.get("cta", ""),
                "assignedInfo": raw.get("assignedInfo", ""),
                "toneElements": raw.get("toneElements", []),
                "ctaStrength": raw.get("ctaStrength", ""),
                "usePlatformLanguage": raw.get("usePlatformLanguage", False),
                "productMentionLevel": raw.get("productMentionLevel", ""),
                "linkAttached": bool(link),
                "linkRule": link_rule,
            },
        })

    posts_result = supabase.table("promotion_posts").insert(posts_payload).execute()
    return posts_result.data or []


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

        operating_rhythm = await _threads_operating_rhythm(body, target_analysis, strategy)
        await _save_step(campaign_id, "threads_operating_rhythm", operating_rhythm)

        calendar = await _calendar_plan(body, target_analysis, strategy, operating_rhythm)
        await _save_step(campaign_id, "calendar_planning", calendar)

        drafts = await _draft_posts(body, target_analysis, strategy, operating_rhythm, calendar)
        await _save_step(campaign_id, "draft_writing", drafts)

        review = await _review_campaign(body, target_analysis, strategy, operating_rhythm, calendar, drafts)
        await _save_step(campaign_id, "review", review)

        final_calendar = review["finalCalendar"]
        posts = _insert_campaign_posts(project_id, user_id, body, campaign_id, final_calendar)

        updated = supabase.table("promotion_campaigns").update({
            "status": "completed",
            "target_analysis": target_analysis,
            "campaign_strategy": {
                **strategy,
                "threadsOperatingRhythm": operating_rhythm,
            },
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
