# RÔLE ARCHITECTURAL : SPOKE 4 (Report Writer)
# Responsabilité : Synthèse finale — reçoit les 3 outputs du HUB, génère le rapport HTML
# Inputs  : scraper_data, sentiment_data, positioning_data (dict ou None si spoke en échec)
# Outputs : rapport HTML complet (str)
# Mode    : haiku 4.5 par défaut, opus 4.6 + thinking adaptatif si deep=True
# Décision deep : proposé après le rapport Haiku, uniquement si l'utilisateur le demande

import asyncio
import json
import time

from utils.claude_client import call_claude_streaming
from utils.logger import get_logger, log_spoke_start, log_spoke_end, log_spoke_error

LOGGER = get_logger("REPORT")

SYSTEM_PROMPT = """Tu es un expert en intelligence compétitive et communication executive B2B.
Ta mission : rédiger un rapport d'analyse compétitive HTML complet, clair et prêt pour une présentation.

Le rapport doit être un document HTML autonome avec CSS inline.
Structure obligatoire :
1. Executive Summary (5 lignes maximum, style accrocheur)
2. Pricing Analysis (tableau comparatif HTML)
3. Feature Comparison Table (tableau HTML : Feature | Nous | Concurrent | Priorité)
4. SWOT Analysis (4 quadrants avec couleurs)
5. Recommandations stratégiques (exactement 3 bullets actionnables)

Style HTML :
- Font : system-ui, sans-serif
- Couleurs SWOT : Forces=#d4edda(vert), Faiblesses=#f8d7da(rouge), Opportunités=#cce5ff(bleu), Menaces=#fff3cd(orange)
- Tables : border-collapse, alternance de couleurs de lignes
- Responsive : max-width 900px, centré
- Header : fond sombre (#1a1a2e), texte blanc, titre + sous-titre

Mentionne explicitement si des données sont manquantes (spoke en échec).
Retourne UNIQUEMENT le HTML complet, commençant par <!DOCTYPE html>."""


def _build_user_prompt(
    competitor_name: str,
    scraper_data: dict | None,
    sentiment_data: dict | None,
    positioning_data: dict | None,
    my_product_name: str = "Notre produit",
) -> str:
    sections = [f"# Rapport d'analyse compétitive : {competitor_name}\n"]
    sections.append(f"**Notre produit** : {my_product_name}\n")

    if scraper_data:
        sections.append(f"## Données Spoke 1 — Pricing & Features\n```json\n{json.dumps(scraper_data, ensure_ascii=False, indent=2)}\n```")
    else:
        sections.append("## Données Spoke 1 — Pricing & Features\n**DONNÉES INDISPONIBLES** (spoke en échec)")

    if sentiment_data:
        sections.append(f"## Données Spoke 2 — Sentiment & Avis\n```json\n{json.dumps(sentiment_data, ensure_ascii=False, indent=2)}\n```")
    else:
        sections.append("## Données Spoke 2 — Sentiment & Avis\n**DONNÉES INDISPONIBLES** (spoke en échec)")

    if positioning_data:
        sections.append(f"## Données Spoke 3 — Positionnement & SWOT\n```json\n{json.dumps(positioning_data, ensure_ascii=False, indent=2)}\n```")
    else:
        sections.append("## Données Spoke 3 — Positionnement\n**DONNÉES INDISPONIBLES** (spoke en échec)")

    return "\n\n".join(sections)


async def run(
    competitor_name: str,
    scraper_data: dict | None,
    sentiment_data: dict | None,
    positioning_data: dict | None,
    my_product_name: str = "Notre produit",
    deep: bool = False,
) -> str:
    """
    Génère le rapport HTML en streaming.
    Retourne le HTML complet (str).
    """
    mode = "DEEP (Opus 4.6)" if deep else "STANDARD (Haiku 4.5)"
    LOGGER.info(f"Démarrage — mode {mode} — concurrent '{competitor_name}'")
    start = time.time()

    user = _build_user_prompt(
        competitor_name, scraper_data, sentiment_data, positioning_data, my_product_name
    )

    html_parts = []
    try:
        async for chunk in call_claude_streaming(
            system=SYSTEM_PROMPT,
            user=user,
            deep=deep,
        ):
            print(chunk, end="", flush=True)
            html_parts.append(chunk)

        print()  # newline après le stream
        elapsed = time.time() - start
        LOGGER.info(f"Terminé — {elapsed:.1f}s")
        return "".join(html_parts)

    except Exception as e:
        log_spoke_error(LOGGER, e)
        return f"<html><body><h1>Erreur lors de la génération du rapport</h1><p>{e}</p></body></html>"


if __name__ == "__main__":
    # Test avec données fictives
    mock_scraper = {
        "pricing_tiers": [
            {"name": "Starter", "price_monthly": 50, "key_features": ["Pipeline", "Email"]},
            {"name": "Pro", "price_monthly": 100, "key_features": ["Tout Starter", "Automatisations", "API"]},
        ],
        "features_list": ["Pipeline kanban", "Email sync", "Reporting", "App mobile", "API REST"],
        "recent_updates": ["Lancement de l'IA predictive (Jan 2026)", "Nouveau module téléphonie (Dec 2025)"],
    }
    mock_sentiment = {
        "avg_score": 4.1,
        "review_count": 2340,
        "top_complaints": ["Prix élevé pour les petites équipes", "Courbe d'apprentissage importante"],
        "top_praises": ["Très complet", "Intégrations nombreuses"],
        "sample_quotes": ["'Puissant mais complexe' — G2", "'Rapport qualité/prix difficile à justifier pour une PME' — Capterra"],
    }
    mock_positioning = {
        "feature_gaps": [
            {"feature": "Téléphonie VoIP", "competitor_has": True, "we_have": False, "priority": "high", "note": "Demande croissante"},
        ],
        "pricing_position": "Nous sommes 40% moins chers sur le plan équivalent.",
        "swot": {
            "forces": ["Prix compétitif", "Facilité d'usage"],
            "faiblesses": ["Moins d'intégrations", "Pas de téléphonie"],
            "opportunites": ["Marché des PME sous-servi", "Migration depuis Excel"],
            "menaces": ["Budget marketing supérieur du concurrent", "Effet réseau"],
        },
    }

    import asyncio
    html = asyncio.run(run("HubSpot (test)", mock_scraper, mock_sentiment, mock_positioning, "FlowDesk"))
    with open("outputs/test_report.html", "w", encoding="utf-8") as f:
        f.write(html)
    print("\n✅ Rapport test sauvegardé : outputs/test_report.html")
