"""Google Gemini API wrapper with structured output support."""

import json
from google import genai
from google.genai import types

from app.core.config import settings
from app.core.exceptions import ExternalAPIError

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


async def generate_text(
    prompt: str,
    system: str | None = None,
    model: str = "gemini-2.5-flash",
) -> str:
    """Generate plain text response."""
    try:
        client = _get_client()
        config = types.GenerateContentConfig(
            system_instruction=system,
        ) if system else None
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=config,
        )
        return response.text
    except Exception as e:
        raise ExternalAPIError("Gemini", str(e))


async def generate_json(
    prompt: str,
    system: str | None = None,
    model: str = "gemini-2.5-flash",
) -> dict | list:
    """Generate structured JSON response."""
    try:
        client = _get_client()
        config = types.GenerateContentConfig(
            system_instruction=system,
            response_mime_type="application/json",
        ) if system else types.GenerateContentConfig(
            response_mime_type="application/json",
        )
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=config,
        )
        return json.loads(response.text)
    except json.JSONDecodeError:
        raise ExternalAPIError("Gemini", "Failed to parse JSON response")
    except Exception as e:
        raise ExternalAPIError("Gemini", str(e))
