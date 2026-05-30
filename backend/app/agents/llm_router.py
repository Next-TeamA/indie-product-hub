"""LLM Router -- task 복잡도별 3-tier 자동 선택.

기획서 §부록 C/E + 결정 의사록 A1.

Tier 1: Gemini 3.5 Flash (최신 Flash, 빠르고 저렴)
Tier 2: GPT-4.1 Mini ($0.15/M input, 50% cache 할인 — 다양성용)
Tier 3: Gemini 3.1 Pro Preview ($2/M in, $12/M out — Anthropic Sonnet 대체)

Anthropic 키 미보유 → Tier 3를 Gemini 3.1 Pro로 대체.
claude_api.py는 보존 (키 발급 시 PRICING/TASK_MAP만 SONNET으로 되돌리면 활성).

Fallback chain: Pro → Mini → Flash (rate limit 시).
"""

from enum import Enum
from typing import Any

from app.core.config import settings
from app.core.exceptions import ExternalAPIError


class Tier(Enum):
    FLASH = "gemini-3.5-flash"        # Tier 1 (최신 Flash)
    MINI = "gpt-4.1-mini"             # Tier 2
    PRO = "gemini-3.1-pro-preview"    # Tier 3 (Anthropic Sonnet 대체)


# (task_type, complexity) → Tier
TASK_MAP: dict[tuple[str, str], Tier] = {
    ("strategy", "low"): Tier.FLASH,
    ("strategy", "high"): Tier.MINI,
    ("content", "low"): Tier.MINI,
    ("content", "high"): Tier.PRO,
    ("engagement_classify", "any"): Tier.FLASH,
    ("engagement_reply", "low"): Tier.MINI,
    ("engagement_reply", "high"): Tier.PRO,
    ("video_script", "any"): Tier.PRO,
    ("performance_pattern", "any"): Tier.FLASH,
    ("judge", "any"): Tier.PRO,
    ("skill_generation", "any"): Tier.PRO,
    ("query_rewrite", "any"): Tier.FLASH,
    ("contextualize", "any"): Tier.FLASH,
}

FALLBACK_CHAIN: dict[Tier, list[Tier]] = {
    Tier.PRO: [Tier.MINI, Tier.FLASH],
    Tier.MINI: [Tier.FLASH],
    Tier.FLASH: [],
}

# 모델별 (input $/M, output $/M, cached_read $/M)
PRICING: dict[Tier, tuple[float, float, float]] = {
    Tier.FLASH: (0.15, 0.60, 0.0375),     # Gemini 3.5 Flash (추정, 75% 캐시 할인)
    Tier.MINI: (0.15, 0.60, 0.075),       # GPT-4.1 Mini, 50% 캐시 할인
    Tier.PRO: (2.0, 12.0, 0.50),          # Gemini 3.1 Pro Preview, 75% 캐시 할인
}


def pick_tier(task_type: str, complexity: str = "low") -> Tier:
    """Pick LLM tier for a task."""
    tier = TASK_MAP.get((task_type, complexity)) or TASK_MAP.get((task_type, "any"))
    return tier or Tier.FLASH


def estimate_cost(
    tier: Tier,
    prompt_tokens: int,
    completion_tokens: int,
    cached_tokens: int = 0,
) -> float:
    """Estimate USD cost for an LLM call."""
    input_price, output_price, cached_price = PRICING[tier]
    uncached_input = max(0, prompt_tokens - cached_tokens)
    cost = (
        uncached_input * input_price
        + cached_tokens * cached_price
        + completion_tokens * output_price
    ) / 1_000_000
    return round(cost, 6)


async def call_llm(
    tier: Tier,
    system: str,
    messages: list[dict],
    tools: list[dict] | None = None,
    response_format: str | None = None,  # 'json' | None
    temperature: float = 0.7,
    max_tokens: int = 4096,
    enable_caching: bool = True,
) -> dict:
    """Unified LLM call with automatic fallback on rate limit.

    Returns {content, tool_calls, usage, model, cost_usd}.
    """
    chain = [tier, *FALLBACK_CHAIN.get(tier, [])]
    last_err: Exception | None = None

    for current_tier in chain:
        try:
            result = await _call_single(
                current_tier, system, messages, tools, response_format,
                temperature, max_tokens, enable_caching,
            )
            return result
        except Exception as e:
            last_err = e
            # 다음 tier로 fallback (rate limit, quota, server error 등)
            continue

    raise ExternalAPIError("LLMRouter", f"All tiers failed. Last: {last_err}")


async def _call_single(
    tier: Tier,
    system: str,
    messages: list[dict],
    tools: list[dict] | None,
    response_format: str | None,
    temperature: float,
    max_tokens: int,
    enable_caching: bool,
) -> dict:
    """Dispatch to specific provider."""
    if tier == Tier.MINI:
        from app.integrations import openai_api
        oai_messages = ([{"role": "system", "content": system}] if system else []) + messages
        kwargs = {"messages": oai_messages, "model": tier.value, "temperature": temperature}
        if response_format == "json":
            kwargs["response_format"] = {"type": "json_object"}
        if tools:
            kwargs["tools"] = [{"type": "function", "function": t} for t in tools]
        resp = await openai_api.chat_completion(**kwargs)
        cost = estimate_cost(
            tier,
            resp["usage"]["prompt_tokens"],
            resp["usage"]["completion_tokens"],
            cached_tokens=resp["usage"].get("cached_tokens", 0),
        )
        return {
            "content": resp["content"],
            "tool_calls": resp.get("tool_calls", []),
            "usage": resp["usage"],
            "model": tier.value,
            "cost_usd": cost,
            "stop_reason": "stop",
        }

    # FLASH (gemini-2.5-flash) + PRO (gemini-2.5-pro) — 둘 다 Gemini
    from app.integrations import gemini
    model_name = tier.value  # "gemini-2.5-flash" or "gemini-2.5-pro"
    prompt = "\n\n".join(m.get("content", "") for m in messages)

    if response_format == "json":
        result = await gemini.generate_json(prompt=prompt, system=system, model=model_name)
        # Gemini SDK는 usage 상세를 항상 노출하지 않음 → cost 추정은 추후 보강
        return {
            "content": result if isinstance(result, str) else str(result),
            "tool_calls": [],
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "cached_tokens": 0},
            "model": model_name,
            "cost_usd": 0.0,
            "stop_reason": "stop",
            "parsed_json": result,
        }

    text = await gemini.generate_text(prompt=prompt, system=system, model=model_name)
    return {
        "content": text,
        "tool_calls": [],
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "cached_tokens": 0},
        "model": model_name,
        "cost_usd": 0.0,
        "stop_reason": "stop",
    }


# ============================================================
# Convenience helpers
# ============================================================

async def call_for_task(
    task_type: str,
    system: str,
    messages: list[dict],
    complexity: str = "low",
    **kwargs: Any,
) -> dict:
    """Pick tier automatically based on task_type and call."""
    tier = pick_tier(task_type, complexity)
    return await call_llm(tier, system, messages, **kwargs)
