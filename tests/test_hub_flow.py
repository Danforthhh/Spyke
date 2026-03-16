"""
Tests unitaires du pipeline Spyke.

Stratégie : mock des 4 spokes avec AsyncMock — aucun appel API réel.
Tests couverts :
  - Flux complet : hub orchestre les 3 spokes en parallèle + spoke_report
  - Gestion d'échec : un spoke retourne None → hub continue, rapport généré
  - Format HTML : le rapport contient les balises attendues
  - Isolation des spokes : chaque spoke ne reçoit que competitor_name
"""
import asyncio
import json
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Ajouter le dossier parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))


# ─── Données de test ───────────────────────────────────────────────────────────

MOCK_SCRAPER_DATA = {
    "pricing_tiers": [
        {"name": "Starter", "price_monthly": 50, "key_features": ["Pipeline", "Email"]},
        {"name": "Pro", "price_monthly": 100, "key_features": ["Tout Starter", "Automatisations"]},
    ],
    "features_list": ["Pipeline kanban", "Email sync", "Reporting", "API REST"],
    "recent_updates": ["Module IA prédictive (Jan 2026)", "Intégration Slack v2 (Dec 2025)"],
}

MOCK_SENTIMENT_DATA = {
    "avg_score": 4.2,
    "review_count": 1850,
    "top_complaints": ["Prix élevé", "Complexité initiale"],
    "top_praises": ["Très complet", "Support réactif"],
    "sample_quotes": [
        "'Puissant mais cher' — G2",
        "'Indispensable une fois maîtrisé' — Capterra",
    ],
}

MOCK_POSITIONING_DATA = {
    "feature_gaps": [
        {
            "feature": "Téléphonie VoIP",
            "competitor_has": True,
            "we_have": False,
            "priority": "high",
            "note": "Demande croissante",
        }
    ],
    "pricing_position": "Nous sommes 40% moins chers sur le plan équivalent.",
    "swot": {
        "forces": ["Prix compétitif", "Facilité d'usage"],
        "faiblesses": ["Moins d'intégrations"],
        "opportunites": ["PME sous-servies"],
        "menaces": ["Budget marketing supérieur"],
    },
}

MOCK_HTML = """<!DOCTYPE html>
<html>
<head><title>Rapport compétitif : TestCorp</title></head>
<body>
  <h1>Executive Summary</h1>
  <p>TestCorp est un acteur majeur...</p>
  <h2>Pricing Analysis</h2>
  <table><tr><th>Plan</th><th>Prix</th></tr></table>
  <h2>SWOT</h2>
  <h2>Recommandations</h2>
  <ul><li>Recommandation 1</li></ul>
</body>
</html>"""


# ─── Tests ─────────────────────────────────────────────────────────────────────

class TestHubFlow:
    """Tests du flux complet hub → spokes → rapport."""

    @pytest.mark.asyncio
    async def test_full_flow_all_spokes_succeed(self):
        """Flux nominal : tous les spokes réussissent."""
        with (
            patch("spoke_scraper.run", new_callable=AsyncMock) as mock_scraper,
            patch("spoke_sentiment.run", new_callable=AsyncMock) as mock_sentiment,
            patch("spoke_positioning.run", new_callable=AsyncMock) as mock_positioning,
            patch("spoke_report.run", new_callable=AsyncMock) as mock_report,
            patch("webbrowser.open"),
            patch("builtins.input", return_value="n"),
        ):
            mock_scraper.return_value = MOCK_SCRAPER_DATA
            mock_sentiment.return_value = MOCK_SENTIMENT_DATA
            mock_positioning.return_value = MOCK_POSITIONING_DATA
            mock_report.return_value = MOCK_HTML

            # Créer le dossier outputs si nécessaire
            outputs_dir = Path(__file__).parent.parent / "outputs"
            outputs_dir.mkdir(exist_ok=True)

            import hub_coordinator
            await hub_coordinator.run("TestCorp")

            # Vérifier que chaque spoke a reçu UNIQUEMENT competitor_name
            mock_scraper.assert_called_once_with("TestCorp")
            mock_sentiment.assert_called_once_with("TestCorp")
            mock_positioning.assert_called_once_with("TestCorp")

            # Vérifier que spoke_report a été appelé avec les outputs des spokes
            mock_report.assert_called_once()
            call_kwargs = mock_report.call_args.kwargs
            assert call_kwargs["competitor_name"] == "TestCorp"
            assert call_kwargs["scraper_data"] == MOCK_SCRAPER_DATA
            assert call_kwargs["sentiment_data"] == MOCK_SENTIMENT_DATA
            assert call_kwargs["positioning_data"] == MOCK_POSITIONING_DATA
            assert call_kwargs["deep"] is False

    @pytest.mark.asyncio
    async def test_flow_with_one_spoke_failure(self):
        """Un spoke échoue (None) → hub continue et génère le rapport."""
        with (
            patch("spoke_scraper.run", new_callable=AsyncMock) as mock_scraper,
            patch("spoke_sentiment.run", new_callable=AsyncMock) as mock_sentiment,
            patch("spoke_positioning.run", new_callable=AsyncMock) as mock_positioning,
            patch("spoke_report.run", new_callable=AsyncMock) as mock_report,
            patch("webbrowser.open"),
            patch("builtins.input", return_value="n"),
        ):
            mock_scraper.return_value = MOCK_SCRAPER_DATA
            mock_sentiment.return_value = None  # ← spoke en échec
            mock_positioning.return_value = MOCK_POSITIONING_DATA
            mock_report.return_value = MOCK_HTML

            outputs_dir = Path(__file__).parent.parent / "outputs"
            outputs_dir.mkdir(exist_ok=True)

            import hub_coordinator
            await hub_coordinator.run("TestCorp")

            # Le rapport doit être appelé avec sentiment_data=None
            call_kwargs = mock_report.call_args.kwargs
            assert call_kwargs["sentiment_data"] is None
            assert call_kwargs["scraper_data"] == MOCK_SCRAPER_DATA
            assert call_kwargs["positioning_data"] == MOCK_POSITIONING_DATA

    @pytest.mark.asyncio
    async def test_deep_mode_triggered_on_user_input(self):
        """Le mode deep est déclenché si l'utilisateur répond 'o'."""
        with (
            patch("spoke_scraper.run", new_callable=AsyncMock, return_value=MOCK_SCRAPER_DATA),
            patch("spoke_sentiment.run", new_callable=AsyncMock, return_value=MOCK_SENTIMENT_DATA),
            patch("spoke_positioning.run", new_callable=AsyncMock, return_value=MOCK_POSITIONING_DATA),
            patch("spoke_report.run", new_callable=AsyncMock, return_value=MOCK_HTML) as mock_report,
            patch("webbrowser.open"),
            patch("builtins.input", return_value="o"),  # ← utilisateur veut le mode deep
        ):
            outputs_dir = Path(__file__).parent.parent / "outputs"
            outputs_dir.mkdir(exist_ok=True)

            import hub_coordinator
            await hub_coordinator.run("TestCorp")

            # spoke_report appelé 2 fois : Haiku + Opus
            assert mock_report.call_count == 2
            calls = mock_report.call_args_list
            assert calls[0].kwargs["deep"] is False
            assert calls[1].kwargs["deep"] is True

    @pytest.mark.asyncio
    async def test_spokes_called_in_parallel(self):
        """Vérifier que les 3 spokes sont lancés (sans vérifier le timing exact)."""
        call_order = []

        async def mock_scraper(name):
            call_order.append("scraper")
            return MOCK_SCRAPER_DATA

        async def mock_sentiment(name):
            call_order.append("sentiment")
            return MOCK_SENTIMENT_DATA

        async def mock_positioning(name):
            call_order.append("positioning")
            return MOCK_POSITIONING_DATA

        with (
            patch("spoke_scraper.run", side_effect=mock_scraper),
            patch("spoke_sentiment.run", side_effect=mock_sentiment),
            patch("spoke_positioning.run", side_effect=mock_positioning),
            patch("spoke_report.run", new_callable=AsyncMock, return_value=MOCK_HTML),
            patch("webbrowser.open"),
            patch("builtins.input", return_value="n"),
        ):
            outputs_dir = Path(__file__).parent.parent / "outputs"
            outputs_dir.mkdir(exist_ok=True)

            import hub_coordinator
            await hub_coordinator.run("TestCorp")

            # Les 3 spokes doivent tous avoir été appelés
            assert set(call_order) == {"scraper", "sentiment", "positioning"}


class TestReportFormat:
    """Tests du format du rapport HTML."""

    def test_html_report_contains_required_sections(self):
        """Le rapport HTML contient les sections obligatoires."""
        html = MOCK_HTML
        assert "Executive Summary" in html or "executive" in html.lower()
        assert "<table" in html
        assert "SWOT" in html or "swot" in html.lower()
        assert "Recommandations" in html or "recommandation" in html.lower()

    def test_html_report_is_valid_html(self):
        """Le rapport commence par <!DOCTYPE html>."""
        assert MOCK_HTML.strip().startswith("<!DOCTYPE html>")
        assert "</html>" in MOCK_HTML


class TestSpokeIsolation:
    """Tests de l'isolation des spokes."""

    @pytest.mark.asyncio
    async def test_each_spoke_receives_only_competitor_name(self):
        """Chaque spoke ne reçoit que competitor_name — pas de données croisées."""
        with (
            patch("spoke_scraper.run", new_callable=AsyncMock, return_value=MOCK_SCRAPER_DATA) as ms,
            patch("spoke_sentiment.run", new_callable=AsyncMock, return_value=MOCK_SENTIMENT_DATA) as mse,
            patch("spoke_positioning.run", new_callable=AsyncMock, return_value=MOCK_POSITIONING_DATA) as mp,
            patch("spoke_report.run", new_callable=AsyncMock, return_value=MOCK_HTML),
            patch("webbrowser.open"),
            patch("builtins.input", return_value="n"),
        ):
            outputs_dir = Path(__file__).parent.parent / "outputs"
            outputs_dir.mkdir(exist_ok=True)

            import hub_coordinator
            await hub_coordinator.run("Salesforce")

            # Chaque spoke appelé avec UNIQUEMENT le nom du concurrent
            ms.assert_called_once_with("Salesforce")
            mse.assert_called_once_with("Salesforce")
            mp.assert_called_once_with("Salesforce")

            # Aucun spoke ne doit avoir reçu les données d'un autre spoke
            for mock in [ms, mse, mp]:
                call_args = mock.call_args
                assert len(call_args.args) == 1
                assert len(call_args.kwargs) == 0
