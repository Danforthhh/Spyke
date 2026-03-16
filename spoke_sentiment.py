# RÔLE ARCHITECTURAL : SPOKE 2 (Sentiment Analyst)
# Responsabilité : Analyser les avis G2, Capterra, Reddit sur le concurrent
# Inputs  : competitor_name (str)
# Outputs : {"avg_score": float, "top_complaints": [...], "top_praises": [...], "sample_quotes": [...]}
# Isolé   : Ne reçoit PAS les outputs des autres spokes
# Modèle  : claude-haiku-4-5 (standard) — décision : rapidité + coût

import asyncio
import json
import time

from utils.claude_client import call_claude
from utils.logger import get_logger, log_spoke_start, log_spoke_end, log_spoke_error, extract_json

LOGGER = get_logger("SENTIMENT")

SYSTEM_PROMPT = """Tu es un analyste spécialisé dans l'analyse des avis clients pour les SaaS B2B.
Ta mission : trouver et analyser les avis sur G2, Capterra, Reddit et autres plateformes
pour un concurrent donné.

Recherche dans cet ordre :
1. Avis G2 (cherche "{competitor} reviews G2" ou site:g2.com {competitor})
2. Avis Capterra (cherche "{competitor} reviews Capterra")
3. Discussions Reddit (cherche "{competitor} reddit review" ou site:reddit.com)

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte :
{
  "avg_score": score moyen sur 5 (float, ex: 4.2),
  "review_count": nombre total d'avis analysés (integer),
  "top_complaints": [
    "Plainte 1 — la plus fréquente",
    "Plainte 2",
    "Plainte 3"
  ],
  "top_praises": [
    "Point fort 1 — le plus mentionné",
    "Point fort 2",
    "Point fort 3"
  ],
  "sample_quotes": [
    "Verbatim 1 (source : G2, date approximative)",
    "Verbatim 2 (source : Capterra)",
    "Verbatim 3 (source : Reddit)"
  ]
}

Maximum 3 verbatims dans sample_quotes. Ne retourne rien d'autre que le JSON."""


async def run(competitor_name: str) -> dict | None:
    """
    Exécute le spoke sentiment pour un concurrent donné.
    Retourne le dict JSON ou None si échec.
    """
    log_spoke_start(LOGGER, competitor_name)
    start = time.time()

    try:
        system = SYSTEM_PROMPT.replace("{competitor}", competitor_name)
        user = f"Analyse les avis clients du concurrent SaaS B2B : {competitor_name}"

        result = await call_claude(system=system, user=user, use_web=True)

        elapsed = time.time() - start
        log_spoke_end(LOGGER, result["input_tokens"], result["output_tokens"], elapsed)

        return extract_json(result["content"])

    except Exception as e:
        log_spoke_error(LOGGER, e)
        return None


if __name__ == "__main__":
    import sys
    competitor = sys.argv[1] if len(sys.argv) > 1 else "HubSpot"
    result = asyncio.run(run(competitor))
    print(json.dumps(result, indent=2, ensure_ascii=False))
