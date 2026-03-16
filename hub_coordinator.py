# RÔLE ARCHITECTURAL : HUB (Coordinateur)
# Responsabilité : Orchestration uniquement — aucune analyse directe
# Inputs  : competitor_name (str)
# Outputs : rapport HTML sauvegardé + affiché dans le navigateur
# Spokes appelés : scraper, sentiment, positioning (en parallèle) → report (séquentiel)
#
# Décisions documentées :
# - asyncio.gather() : spokes 1-3 isolés, chacun reçoit UNIQUEMENT competitor_name
# - Gestion d'échec : si un spoke retourne None, le hub continue et le rapport le mentionne
# - Mode deep : proposé après le rapport Haiku complet — l'utilisateur choisit
# - Format : HTML sauvegardé + ouverture automatique dans le navigateur

import asyncio
import json
import sys
import webbrowser
from datetime import datetime
from pathlib import Path

import spoke_scraper
import spoke_sentiment
import spoke_positioning
import spoke_report
from utils.logger import get_logger

LOGGER = get_logger("HUB")
OUTPUTS_DIR = Path(__file__).parent / "outputs"


def _load_product_name() -> str:
    """Extrait le nom du produit depuis my_product.json pour le rapport."""
    base = Path(__file__).parent
    for filename in ("my_product.json", "my_product.example.json"):
        path = base / filename
        if path.exists():
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                return data.get("name", "Notre produit")
            except Exception:
                pass
    return "Notre produit"


def _save_report(competitor_name: str, html: str, suffix: str = "") -> Path:
    """Sauvegarde le rapport HTML dans outputs/ et retourne le chemin."""
    OUTPUTS_DIR.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%Hh%M")
    safe_name = competitor_name.lower().replace(" ", "_")
    filename = f"{safe_name}_{timestamp}{suffix}.html"
    path = OUTPUTS_DIR / filename
    path.write_text(html, encoding="utf-8")
    return path


async def run(competitor_name: str) -> None:
    """
    Flux principal du HUB :
    1. Lance les spokes 1, 2, 3 en parallèle (isolés — chacun reçoit uniquement competitor_name)
    2. Collecte les résultats (None si spoke en échec)
    3. Appelle le spoke_report (Haiku) → stream dans le terminal → sauvegarde HTML → ouvre navigateur
    4. Propose un rapport approfondi avec Opus 4.6 + thinking adaptatif
    """
    LOGGER.info(f"=== DÉMARRAGE ANALYSE : {competitor_name} ===")
    LOGGER.info("Lancement parallèle des spokes 1 (Scraper), 2 (Sentiment), 3 (Positioning)...")

    # ÉTAPE 1 : Spokes en parallèle — isolation totale
    scraper_data, sentiment_data, positioning_data = await asyncio.gather(
        spoke_scraper.run(competitor_name),
        spoke_sentiment.run(competitor_name),
        spoke_positioning.run(competitor_name),
        return_exceptions=False,
    )

    # Rapport sur les spokes en échec
    failed = []
    if scraper_data is None:
        failed.append("Spoke 1 (Scraper)")
    if sentiment_data is None:
        failed.append("Spoke 2 (Sentiment)")
    if positioning_data is None:
        failed.append("Spoke 3 (Positioning)")

    if failed:
        LOGGER.warning(f"Spokes en échec : {', '.join(failed)} — rapport généré avec données partielles")
    else:
        LOGGER.info("Tous les spokes ont réussi.")

    my_product_name = _load_product_name()

    # ÉTAPE 2 : Rapport Haiku (mode standard)
    print("\n" + "="*60)
    print(f"  RAPPORT COMPÉTITIF : {competitor_name.upper()}")
    print(f"  Mode : STANDARD (Haiku 4.5)")
    print("="*60 + "\n")

    html = await spoke_report.run(
        competitor_name=competitor_name,
        scraper_data=scraper_data,
        sentiment_data=sentiment_data,
        positioning_data=positioning_data,
        my_product_name=my_product_name,
        deep=False,
    )

    # ÉTAPE 3 : Sauvegarde + ouverture navigateur
    report_path = _save_report(competitor_name, html)
    print(f"\n✅ Rapport sauvegardé : {report_path}")
    webbrowser.open(report_path.as_uri())

    # ÉTAPE 4 : Proposer le mode deep
    print("\n" + "-"*60)
    print("  Voulez-vous un rapport approfondi avec Opus 4.6 ?")
    print("  (Analyse plus profonde, thinking adaptatif, ~30-60s supplémentaires)")
    print("-"*60)

    try:
        answer = input("  [o/N] → ").strip().lower()
    except (EOFError, KeyboardInterrupt):
        answer = "n"

    if answer == "o":
        print("\n" + "="*60)
        print(f"  RAPPORT APPROFONDI : {competitor_name.upper()}")
        print(f"  Mode : DEEP (Opus 4.6 + Thinking adaptatif)")
        print("="*60 + "\n")

        html_deep = await spoke_report.run(
            competitor_name=competitor_name,
            scraper_data=scraper_data,
            sentiment_data=sentiment_data,
            positioning_data=positioning_data,
            my_product_name=my_product_name,
            deep=True,
        )

        deep_path = _save_report(competitor_name, html_deep, suffix="_deep")
        print(f"\n✅ Rapport approfondi sauvegardé : {deep_path}")
        webbrowser.open(deep_path.as_uri())
    else:
        print("\n  Analyse terminée.")

    LOGGER.info(f"=== FIN ANALYSE : {competitor_name} ===")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage : python hub_coordinator.py <nom_du_concurrent>")
        print("Exemple : python hub_coordinator.py HubSpot")
        sys.exit(1)

    competitor = " ".join(sys.argv[1:])
    asyncio.run(run(competitor))
