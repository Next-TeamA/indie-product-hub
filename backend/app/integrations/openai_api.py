"""OpenAI API wrapper -- embeddings, Whisper transcription, Moderation, GPT-4.1 Mini.

용도 (기획서 §부록 C/F + §7.4):
- Embeddings: text-embedding-3-small (fallback, default는 Cohere embed-v4)
- Whisper: 영상 자막 생성 (verbose_json + word-level timestamps)
- Moderation: 콘텐츠 안전 가드 (무료)
- GPT-4.1 Mini: LLM Router Tier 2
"""

from typing import Any

from openai import AsyncOpenAI

from app.core.config import settings
from app.core.exceptions import ExternalAPIError

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        if not settings.openai_api_key:
            raise ExternalAPIError("OpenAI", "OPENAI_API_KEY not configured")
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


# ============================================================
# Embeddings
# ============================================================

async def embed_texts(
    texts: list[str],
    model: str = "text-embedding-3-small",
) -> list[list[float]]:
    """Batch embed texts. Returns list of embedding vectors (dimension 1536)."""
    try:
        client = _get_client()
        resp = await client.embeddings.create(model=model, input=texts)
        return [d.embedding for d in resp.data]
    except Exception as e:
        raise ExternalAPIError("OpenAI", f"Embed failed: {e}")


# ============================================================
# Whisper (transcription + captions)
# ============================================================

async def transcribe_audio(
    audio_path: str,
    response_format: str = "verbose_json",
    language: str | None = None,
) -> dict:
    """Transcribe audio. Returns {text, words: [{word, start, end}], ...}.

    `language`: ISO-639-1 code (e.g. 'ko', 'en'). None = auto-detect.
    """
    try:
        client = _get_client()
        with open(audio_path, "rb") as f:
            kwargs: dict[str, Any] = {
                "model": "whisper-1",
                "file": f,
                "response_format": response_format,
                "timestamp_granularities": ["word"],
            }
            if language:
                kwargs["language"] = language
            result = await client.audio.transcriptions.create(**kwargs)

        if hasattr(result, "model_dump"):
            return result.model_dump()
        return dict(result)
    except Exception as e:
        raise ExternalAPIError("OpenAI", f"Transcribe failed: {e}")


# ============================================================
# Moderation (무료)
# ============================================================

async def moderate(text: str) -> dict:
    """Returns moderation result. Keys: flagged (bool), categories (dict), category_scores (dict)."""
    try:
        client = _get_client()
        resp = await client.moderations.create(model="omni-moderation-latest", input=text)
        result = resp.results[0]
        return {
            "flagged": result.flagged,
            "categories": result.categories.model_dump(),
            "category_scores": result.category_scores.model_dump(),
        }
    except Exception as e:
        raise ExternalAPIError("OpenAI", f"Moderation failed: {e}")


# ============================================================
# GPT-4.1 Mini (Tier 2 LLM Router)
# ============================================================

async def chat_completion(
    messages: list[dict],
    model: str = "gpt-4.1-mini",
    temperature: float = 0.7,
    response_format: dict | None = None,
    tools: list[dict] | None = None,
) -> dict:
    """Generic chat completion. Returns {content, usage, tool_calls}."""
    try:
        client = _get_client()
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        if response_format:
            kwargs["response_format"] = response_format
        if tools:
            kwargs["tools"] = tools
        resp = await client.chat.completions.create(**kwargs)
        msg = resp.choices[0].message
        return {
            "content": msg.content,
            "tool_calls": [
                {"name": tc.function.name, "args": tc.function.arguments}
                for tc in (msg.tool_calls or [])
            ],
            "usage": {
                "prompt_tokens": resp.usage.prompt_tokens,
                "completion_tokens": resp.usage.completion_tokens,
                "cached_tokens": getattr(resp.usage, "prompt_tokens_details", {}).cached_tokens if hasattr(resp.usage, "prompt_tokens_details") else 0,
            },
        }
    except Exception as e:
        raise ExternalAPIError("OpenAI", f"Chat completion failed: {e}")
