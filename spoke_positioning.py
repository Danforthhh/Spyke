# RÔLE ARCHITECTURAL : SPOKE 3 (Positioning Analyst)
# Responsabilité : Comparer le concurrent avec my_product.json
# Inputs  : competitor_name (str) + contenu my_product.json (injecté dans le prompt)
# Outputs : {"feature_gaps": [...], "pricing_position": str, "swot": {...}}
# Isolé   : Ne reçoit PAS les outputs des autres spokes
# Note    : my_product.json est dans .gitignore (données sensibles)
# Modèle  : claude-haiku-4-5 (standard) — décision : rapidité + coût

import asyncio
import json
import time
from pathlib import Path

from utils.claude_client import call_claude
from utils.logger import get_logger, log_spoke_start, log_spoke_end, log_spoke_error

LOGGER = get_logger("POSITIONING")

SYSTEM_PROMPT = """Tu es un expert en stratégie produit et positionnement SaaS B2B.
Ta mission : analyser comment notre produit se positionne face à un concurrent,
en t'appuyant sur les données de notre produit ET des recherches web sur le concurrent.

Recherche d'abord des informations sur le concurrent via le web, puis compare avec notre produit.

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte :
{
  "feature_gaps": [
    {
      "feature": "nom de la fonctionnalité",
      "competitor_has": true/false,
      "we_have": true/false,
      "priority": "high/medium/low",
      "note": "contexte ou impact"
    }
  ],
  "pricing_position": "description de notre position tarifaire vs concurrent (1-2 phrases)",
  "swot": {
    "forces": ["Force 1 de notre produit vs ce concurrent", "Force 2", "Force 3"],
    "faiblesses": ["Faiblesse 1 de notre produit vs ce concurrent", "Faiblesse 2"],
    "opportunites": ["Opportunité 1 à saisir", "Opportunité 2"],
    "menaces": ["Menace 1 que ce concurrent représente", "Menace 2"]
  }
}

Ne retourne rien d'autre que le JSON."""


def _load_my_product() -> dict:
    """Charge my_product.json. Fallback sur my_product.example.json si absent."""
    base = Path(__file__).parent
    product_path = base / "my_product.json"
    example_path = base / "my_product.example.json"

    if product_path.exists():
        return json.loads(product_path.read_text(encoding="utf-8"))
    elif example_path.exists():
        LOGGER.warning("my_product.json introuvable — utilisation de my_product.example.json")
        return json.loads(example_path.read_text(encoding="utf-8"))
    else:
        raise FileNotFoundError(
            "Ni my_product.json ni my_product.example.json n'ont été trouvés. "
            "Copiez my_product.example.json → my_product.json et renseignez votre produit."
        )


async def run(competitor_name: str) -> dict | None:
    """
    Exécute le spoke positioning pour un concurrent donné.
    Retourne le dict JSON ou None si échec.
    """
    log_spoke_start(LOGGER, competitor_name)
    start = time.time()

    try:
        my_product = _load_my_product()
        my_product_str = json.dumps(my_product, ensure_ascii=False, indent=2)

        system = SYSTEM_PROMPT
        user = f"""Concurrent à analyser : {competitor_name}

Voici les données de notre produit :
```json
{my_product_str}
```

Recherche les informations sur {competitor_name} via le web, puis produis l'analyse de positionnement."""

        result = await call_claude(system=system, user=user, use_web=True)

        elapsed = time.time() - start
        log_spoke_end(LOGGER, result["input_tokens"], result["output_tokens"], elapsed)

        content = result["content"].strip()
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
