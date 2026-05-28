"""Anthropic Claude API wrapper -- Sonnet 4.6 (Tier 3 LLM Router).

[비활성 — 2026-05-16]
현재 ANTHROPIC_API_KEY 미보유로 LLM Router Tier 3는 Gemini 2.5 Pro로 대체됨.
이 파일은 보존: 키 발급 시 llm_router.py의 Tier.PRO를 SONNET으로 되돌리고
_call_single에 claude 경로 추가하면 즉시 활성화 가능.

용도 (기획서 §부록 C/I):
- Content Agent: voice 매칭 카피라이팅 (품질 최우선)
- LLM-as-Judge: 다른 모델이 생성한 콘텐츠 평가 (sycophancy 방지)
- RiskGuard: 복잡한 안전 판단

프롬프트 캐싱 자동 적용:
- 시스템 프롬프트 + 도구 정의 → ephemeral 1h cache (read 90% 할인)
"""

from typing import Any

from anthropic import AsyncAnthropic

from app.core.config import settings
from app.core.exceptions import ExternalAPIError

_client: AsyncAnthropic | None = None


def _get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        if not settings.anthropic_api_key:
            raise ExternalAPIError("Anthropic", "ANTHROPIC_API_KEY not configured")
        _client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


async def messages_create(
    system: str | list[dict],
    messages: list[dict],
    model: str = "claude-sonnet-4-6",
    max_tokens: int = 4096,
    temperature: float = 0.7,
    tools: list[dict] | None = None,
    enable_caching: bool = True,
    cache_ttl: str = "1h",
) -> dict:
    """Anthropic messages.create with automatic prompt caching.

    `enable_caching=True` 일 때 system + tools에 cache_control 자동 주입.
    `cache_ttl`: 'ephemeral' (5min) | '1h' (persistent)

    Returns {content, usage, tool_use}.
    """
    try:
        client = _get_client()

        # 시스템 프롬프트에 cache_control 주입
        if isinstance(system, str) and enable_caching:
            system_blocks = [{
                "type": "text",
                "text": system,
                "cache_control": {"type": "ephemeral", "ttl": cache_ttl} if cache_ttl == "1h"
                                  else {"type": "ephemeral"},
            }]
        elif isinstance(system, str):
            system_blocks = [{"type": "text", "text": system}]
        else:
            system_blocks = system

        kwargs: dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "system": system_blocks,
            "messages": messages,
        }

        # 도구 정의에도 cache_control (마지막 도구에만 — Anthropic 권장)
        if tools:
            if enable_caching and tools:
                tools_with_cache = tools.copy()
                tools_with_cache[-1] = {
                    **tools_with_cache[-1],
                    "cache_control": {"type": "ephemeral"},
                }
                kwargs["tools"] = tools_with_cache
            else:
                kwargs["tools"] = tools

        resp = await client.messages.create(**kwargs)

        text_content = ""
        tool_use_blocks = []
        for block in resp.content:
            if block.type == "text":
                text_content += block.text
            elif block.type == "tool_use":
                tool_use_blocks.append({
                    "id": block.id,
                    "name": block.name,
                    "input": block.input,
                })

        return {
            "content": text_content,
            "tool_use": tool_use_blocks,
            "stop_reason": resp.stop_reason,
            "usage": {
                "input_tokens": resp.usage.input_tokens,
                "output_tokens": resp.usage.output_tokens,
                "cache_creation_input_tokens": getattr(resp.usage, "cache_creation_input_tokens", 0),
                "cache_read_input_tokens": getattr(resp.usage, "cache_read_input_tokens", 0),
            },
        }
    except Exception as e:
        raise ExternalAPIError("Anthropic", f"messages.create failed: {e}")
