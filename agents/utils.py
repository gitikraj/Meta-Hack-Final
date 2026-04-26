"""
agents/utils.py — Shared utilities for all agent modules.
"""

import json
import os
import ssl
import time

import httpx
from dotenv import load_dotenv
from groq import AsyncGroq

load_dotenv()

# ── Shared Groq client ──────────────────────────────────────────
_GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
_GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

_client: AsyncGroq | None = None


def get_llm_client() -> AsyncGroq:
    """Return a shared AsyncGroq client (lazy-initialised)."""
    global _client
    if _client is None:
        _client = AsyncGroq(
            api_key=_GROQ_API_KEY,
            http_client=httpx.AsyncClient(verify=False),
        )
    return _client


def get_model() -> str:
    """Return the configured model name."""
    return _GROQ_MODEL


async def llm_call(*, system: str, user_message: str, max_tokens: int = 4096) -> str:
    """
    Single helper that wraps the Groq chat-completions API.
    Every agent calls this instead of building its own client.
    """
    client = get_llm_client()
    response = await client.chat.completions.create(
        model=get_model(),
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_message},
        ],
    )
    return response.choices[0].message.content.strip()


def safe_parse_json(raw: str) -> dict:
    """Parse JSON from LLM output, stripping markdown fences if present."""
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1]
        if cleaned.endswith("```"):
            cleaned = cleaned[: cleaned.rfind("```")]
        cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        return {"error": "invalid_json", "raw_output": raw}


class Timer:
    """Simple context-manager timer (milliseconds)."""

    def __enter__(self):
        self._start = time.perf_counter()
        return self

    def __exit__(self, *_):
        self.elapsed_ms = round((time.perf_counter() - self._start) * 1000)
