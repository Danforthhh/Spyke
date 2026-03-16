# Spyke — Competitive Intelligence Pipeline

Pipeline d'analyse compétitive multi-agents en Python, architecture **Hub-and-Spoke** explicite.

Entrez le nom d'un concurrent SaaS B2B → recevez un rapport HTML complet avec pricing, avis clients, SWOT et recommandations.

---

## Architecture

```
                    ┌─────────────────┐
                    │   HUB           │
                    │ hub_coordinator │
                    └────────┬────────┘
                             │ asyncio.gather() — isolation totale
           ┌─────────────────┼─────────────────┐
           │                 │                 │
    ┌──────▼──────┐  ┌───────▼──────┐  ┌──────▼──────────┐
    │  SPOKE 1    │  │   SPOKE 2    │  │    SPOKE 3      │
    │  Scraper    │  │  Sentiment   │  │  Positioning    │
    │  (Sonnet)   │  │  (Sonnet)    │  │  (Sonnet)       │
    └──────┬──────┘  └───────┬──────┘  └──────┬──────────┘
           └─────────────────┼─────────────────┘
                             │ outputs collectés par le HUB
                    ┌────────▼────────┐
                    │   SPOKE 4       │
                    │  Report Writer  │
                    │  (Haiku / Opus) │
                    └─────────────────┘
```

| Composant | Modèle | Rôle |
|---|---|---|
| Spoke 1 — Scraper | Sonnet 4.6 + web search | Pricing, features, recent updates |
| Spoke 2 — Sentiment | Sonnet 4.6 + web search | Avis G2, Capterra, Reddit |
| Spoke 3 — Positioning | Sonnet 4.6 + web search | SWOT vs votre produit |
| Spoke 4 — Report | Haiku 4.5 (ou Opus 4.6 en mode deep) | Rapport HTML |

---

## Installation

```bash
git clone https://github.com/Danforthhh/Spyke.git
cd Spyke

pip install -r requirements.txt

cp .env.example .env
# Renseigner ANTHROPIC_API_KEY dans .env

cp my_product.example.json my_product.json
# Renseigner les données de votre produit dans my_product.json
```

---

## Usage

```bash
# Analyse standard (Haiku — rapide, ~2-3min)
python hub_coordinator.py "HubSpot"

# Le rapport HTML s'ouvre automatiquement dans votre navigateur
# Puis le programme propose un rapport approfondi avec Opus 4.6
```

### Tests d'un spoke individuel

```bash
python spoke_scraper.py "Salesforce"
python spoke_sentiment.py "Salesforce"
python spoke_positioning.py "Salesforce"
```

### Tests unitaires (sans appels API)

```bash
python -m pytest tests/
```

---

## Fichiers sensibles (dans `.gitignore`)

| Fichier | Contenu |
|---|---|
| `.env` | Clé API Anthropic |
| `my_product.json` | Données réelles de votre produit |
| `outputs/` | Rapports générés |

---

## Décisions techniques

| Sujet | Décision | Raison |
|---|---|---|
| Web tools | Sonnet 4.6 requis | Haiku 4.5 ne supporte pas web_search/web_fetch |
| Rapport initial | Haiku 4.5 | Pas besoin du web, 10x moins cher |
| Mode deep | Opus 4.6 + thinking adaptatif | Proposé interactivement après rapport Haiku |
| Parallélisme | asyncio.gather() | Isolation totale — chaque spoke ne reçoit que competitor_name |
| Prompt caching | cache_control ephemeral | Réduction des coûts sur analyses répétées |
| Format rapport | HTML | Rendu riche, tables, SWOT coloré, partage facile |
