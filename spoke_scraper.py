# RÔLE ARCHITECTURAL : SPOKE 1 (Web Scraper)
# Responsabilité : Collecter pricing, features, recent_updates via web search
# Inputs  : competitor_name (str)
# Outputs : {"pricing_tiers": [...], "features_list": [...], "recent_updates": [...]}
# Isolé   : Ne reçoit PAS les outputs des autres spokes
# Modèle  : claude-haiku-4-5 (standard) — décision : rapidité + coût

import asyncio
import json
import time

from utils.claude_client import call_claude
from utils.logger import get_logger, log_spoke_start, log_spoke_end, log_spoke_error

LOGGER = get_logger("SCRAPER")

SYSTEM_PROMPT = """Tu es un analyste compétitif spécialisé dans les SaaS B2B.
Ta mission : collecter des informations précises sur le produit et le pricing d'un concurrent
en utilisant les outils de recherche web à ta disposition.

Recherche dans cet ordre :
1. La page de pricing officielle du concurrent (cherche "{competitor} pricing")
2. La page des fonctionnalités / features (cherche "{competitor} features")
3. Le changelog ou les dernières mises à jour (cherche "{competitor} changelog" ou "new features")

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte :
{
  "pricing_tiers": [
    {
      "name": "nom du plan",
      "price_monthly": prix en USD (number ou null si non public),
      "price_annual": prix annuel par mois (number ou null),
      "key_features": ["feature1", "feature2"]
    }
  ],
  "features_list": ["feature1", "feature2", ...],
  "recent_updates": ["update1 (date si disponible)", "update2", ...]
}

Ne retourne rien d'autre que le JSON. Pas de markdown, pas d'explication."""


async def run(competitor_name: str) -> dict | None:
    """
    Exécute le spoke scraper pour un concurrent donné.
    Retourne le dict JSON ou None si échec.
    """
    log_spoke_start(LOGGER, competitor_name)
    start = time.time()

    try:
        system = SYSTEM_PROMPT.replace("{competitor}", competitor_name)
        user = f"Analyse le concurrent SaaS B2B : {competitor_name}"

        result = await call_claude(system=system, user=user, use_web=True)

        elapsed = time.time() - start
        log_spoke_end(LOGGER, result["input_tokens"], result["output_tokens"], elapsed)

        # Parser le JSON retourné par Claude
        content = result["content"].strip()
        # Nettoyer si Claude a quand même ajouté des backticks
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content)

    except Exception as e:
        log_spoke_error(LOGGER, e)
        return None


if __name__ == "__main__":
    import sys
    competitor = sys.argv[1] if len(sys.argv) > 1 else "HubSpot"
    result = asyncio.run(run(competitor))
    print(json.dumps(result, indent=2, ensure_ascii=False))
