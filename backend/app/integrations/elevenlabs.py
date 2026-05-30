"""ElevenLabs API wrapper -- TTS for video narration.

용도 (기획서 §7.3):
- TTS: 영상 내레이션 (eleven_turbo_v2_5 영어, eleven_multilingual_v2 한국어)
- Voice clone: 사용자 voice clone (Pro 플랜)

비용: $0.30/1k chars (multilingual), Turbo는 $0.15/1k (영어)
"""

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalAPIError

ELEVEN_BASE = "https://api.elevenlabs.io/v1"


def _headers() -> dict[str, str]:
    if not settings.elevenlabs_api_key:
        raise ExternalAPIError("ElevenLabs", "ELEVENLABS_API_KEY not configured")
    return {"xi-api-key": settings.elevenlabs_api_key}


# ============================================================
# Text-to-Speech
# ============================================================

async def text_to_speech(
    text: str,
    voice_id: str | None = None,
    model_id: str | None = None,
    lang: str = "en",
    stability: float = 0.5,
    similarity_boost: float = 0.75,
) -> bytes:
    """Generate speech. Returns MP3 bytes.

    `lang`: 'en' = Turbo (cheaper, faster), 'ko' or other = multilingual_v2
    `voice_id`: None이면 settings의 default 사용 (lang별 다른 default)
    """
    # 언어별 default model + voice
    if model_id is None:
        model_id = "eleven_turbo_v2_5" if lang == "en" else "eleven_multilingual_v2"
    if voice_id is None:
        voice_id = (
            settings.elevenlabs_default_voice_id_ko if lang == "ko"
                                                    else settings.elevenlabs_default_voice_id
        )

    if not voice_id:
        raise ExternalAPIError("ElevenLabs", f"No voice_id configured for lang={lang}")

    payload = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": stability,
            "similarity_boost": similarity_boost,
        },
        "output_format": "mp3_44100_128",
    }

    async with httpx.AsyncClient(timeout=120) as client:
        try:
            r = await client.post(
                f"{ELEVEN_BASE}/text-to-speech/{voice_id}",
                headers={**_headers(), "Content-Type": "application/json"},
                json=payload,
            )
            r.raise_for_status()
            return r.content
        except httpx.HTTPError as e:
            raise ExternalAPIError("ElevenLabs", f"TTS failed: {e}")


# ============================================================
# Voice list / management
# ============================================================

async def list_voices() -> list[dict]:
    """List all available voices (preset + cloned)."""
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            r = await client.get(f"{ELEVEN_BASE}/voices", headers=_headers())
            r.raise_for_status()
            return r.json().get("voices", [])
        except httpx.HTTPError as e:
            raise ExternalAPIError("ElevenLabs", f"List voices failed: {e}")


async def get_user_subscription() -> dict:
    """Get current usage + remaining characters."""
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            r = await client.get(f"{ELEVEN_BASE}/user/subscription", headers=_headers())
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError as e:
            raise ExternalAPIError("ElevenLabs", f"Subscription fetch failed: {e}")
