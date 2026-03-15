"""LLM service — chat completions via OpenRouter."""

import json
import logging

import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
_TIMEOUT = 30.0


async def ask_llm(
    prompt: str,
    system: str = "",
    model: str | None = None,
) -> str:
    """Send a chat completion request to OpenRouter and return the reply text.

    Falls back to a human-readable message when no API key is configured so
    callers don't need to guard against missing credentials.
    """
    settings = get_settings()
    api_key = settings.openrouter_api_key
    if not api_key:
        logger.warning("OPENROUTER_API_KEY not configured — returning fallback")
        return "LLM is not configured. Set OPENROUTER_API_KEY to enable AI answers."

    resolved_model = model or settings.openrouter_default_model

    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": resolved_model,
        "messages": messages,
    }

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except httpx.HTTPStatusError as exc:
        logger.error(
            "OpenRouter HTTP %s: %s", exc.response.status_code, exc.response.text
        )
        return "Sorry, the LLM request failed. Please try again later."
    except (httpx.RequestError, KeyError, IndexError, json.JSONDecodeError) as exc:
        logger.error("OpenRouter request error: %s", exc)
        return "Sorry, the LLM request failed. Please try again later."
