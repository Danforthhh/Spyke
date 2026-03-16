"""
Wrapper async autour du SDK Anthropic.

Décisions techniques documentées :
- Sonnet 4.6 : mode standard avec web tools — spokes 1-3 (Haiku ne supporte pas web_search)
- Haiku 4.5  : rapport initial sans web tools (spoke 4)
- Opus 4.6   : mode deep (thinking adaptatif) — rapport approfondi sur demande
- web_search + web_fetch (server-side) : déclarés dans tools[], Claude les utilise
  automatiquement. Gestion du stop_reason "pause_turn" incluse.
- cache_control ephemeral : appliqué sur les system prompts pour réduire les coûts
  lors d'analyses répétées du même concurrent.
- Streaming : activé pour le spoke_report (long output HTML).
"""
import os
import asyncio
from typing import AsyncGenerator

import anthropic
from dotenv import load_dotenv

load_dotenv()

MODEL_WEB = "claude-sonnet-4-6"    # web_search/web_fetch — Haiku ne supporte pas ces tools
MODEL_STANDARD = "claude-haiku-4-5"  # rapport sans web tools (plus économique)
MODEL_DEEP = "claude-opus-4-6"

WEB_TOOLS = [
    {"type": "web_search_20260209", "name": "web_search"},
    {"type": "web_fetch_20260209", "name": "web_fetch"},
]


def _build_system_with_cache(system_text: str) -> list[dict]:
    """Encapsule le system prompt avec cache_control ephemeral."""
    return [
        {
            "type": "text",
            "text": system_text,
            "cache_control": {"type": "ephemeral"},
        }
    ]


async def call_claude(
    system: str,
    user: str,
    deep: bool = False,
    use_web: bool = True,
) -> dict:
    """
    Appel Claude non-streamé. Retourne {"content": str, "input_tokens": int, "output_tokens": int}.

    Gère automatiquement le stop_reason "pause_turn" (web tools > 10 itérations).
    """
    client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    if deep:
        model = MODEL_DEEP
    elif use_web:
        model = MODEL_WEB   # Sonnet 4.6 requis pour web_search/web_fetch
    else:
        model = MODEL_STANDARD
    tools = WEB_TOOLS if use_web else []

    kwargs = {
        "model": model,
        "max_tokens": 4096,
        "system": _build_system_with_cache(system),
        "messages": [{"role": "user", "content": user}],
    }
    if tools:
        kwargs["tools"] = tools
    if deep:
        kwargs["thinking"] = {"type": "adaptive"}

    messages = list(kwargs["messages"])
    total_in = 0
    total_out = 0
    final_text = ""

    # Loop pour gérer pause_turn (web tools qui dépassent 10 itérations)
    max_continuations = 10
    for _ in range(max_continuations):
        kwargs["messages"] = messages
        response = await client.messages.create(**kwargs)
        total_in += response.usage.input_tokens
        total_out += response.usage.output_tokens

        # Extraire le texte des blocs content
        for block in response.content:
            if hasattr(block, "text"):
                final_text += block.text

        if response.stop_reason != "pause_turn":
            break

        # Relancer si pause_turn : ajouter le tour assistant et continuer
        messages.append({"role": "assistant", "content": response.content})

    return {
        "content": final_text,
        "input_tokens": total_in,
        "output_tokens": total_out,
    }


async def call_claude_streaming(
    system: str,
    user: str,
    deep: bool = False,
) -> AsyncGenerator[str, None]:
    """
    Appel Claude streamé. Yield les deltas texte au fur et à mesure.
    Utilisé par spoke_report pour afficher le rapport en temps réel.
    """
    client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    model = MODEL_DEEP if deep else MODEL_STANDARD

    kwargs = {
        "model": model,
        "max_tokens": 8192,
        "system": _build_system_with_cache(system),
        "messages": [{"role": "user", "content": user}],
    }
    if deep:
        kwargs["thinking"] = {"type": "adaptive"}

    async with client.messages.stream(**kwargs) as stream:
        async for text in stream.text_stream:
            yield text
