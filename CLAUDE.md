# Spyke — Règles architecturales

## Architecture : HUB-AND-SPOKE

Ce projet implémente un pipeline d'analyse compétitive multi-agents avec une architecture
Hub-and-Spoke **explicite**. Chaque composant a un rôle unique et non négociable.

### Le HUB (`hub_coordinator.py`)
- **Responsabilité UNIQUE** : recevoir l'input, dispatcher aux spokes en parallèle,
  collecter les résultats, appeler le spoke de synthèse.
- Le hub **NE fait PAS** d'analyse lui-même.
- Le hub **NE communique PAS** les résultats d'un spoke à un autre spoke.
- Chaque spoke travaille de façon **ISOLÉE**.

### Les SPOKES
| Fichier | Rôle | Input | Output |
|---|---|---|---|
| `spoke_scraper.py` | Web Scraper | `competitor_name` | `{pricing_tiers, features_list, recent_updates}` |
| `spoke_sentiment.py` | Sentiment Analyst | `competitor_name` | `{avg_score, top_complaints, top_praises, sample_quotes}` |
| `spoke_positioning.py` | Positioning Analyst | `competitor_name` + `my_product.json` | `{feature_gaps, pricing_position, swot}` |
| `spoke_report.py` | Report Writer | outputs des 3 spokes (via hub) | rapport HTML |

### Règles absolues
1. Un spoke ne reçoit **jamais** l'output d'un autre spoke.
2. Le hub ne fait **jamais** d'appel Claude directement.
3. Chaque spoke loggue : début, fin, token count.
4. Si un spoke échoue, le hub continue et mentionne l'échec dans le rapport.

---

## Variables d'environnement requises

```bash
ANTHROPIC_API_KEY=sk-ant-...   # Clé API Anthropic (dans .env, jamais commitée)
```

Copier `.env.example` → `.env` et renseigner la clé.

---

## Modèles utilisés

| Mode | Modèle | Usage |
|---|---|---|
| Standard (défaut) | `claude-haiku-4-5` | Spokes 1-3 + rapport initial |
| Deep (`--deep` / interactif) | `claude-opus-4-6` + adaptive thinking | Rapport approfondi uniquement |

**Décision** : Haiku pour la première passe (rapide, ~15s, 10x moins cher).
Opus proposé après le rapport Haiku si l'utilisateur veut approfondir.

---

## Commandes d'usage

```bash
# Installation
pip install -r requirements.txt
cp .env.example .env          # puis renseigner ANTHROPIC_API_KEY
cp my_product.example.json my_product.json  # puis renseigner votre produit

# Analyse d'un concurrent
python hub_coordinator.py "HubSpot"

# Test d'un spoke individuel
python spoke_scraper.py "Salesforce"
python spoke_sentiment.py "Salesforce"
python spoke_positioning.py "Salesforce"

# Tests unitaires
python -m pytest tests/
```

---

## Données sensibles — NE JAMAIS COMMITER

| Fichier | Contenu sensible |
|---|---|
| `.env` | Clé API Anthropic |
| `my_product.json` | Données réelles du produit (pricing, roadmap, positionnement) |
| `outputs/` | Rapports générés (intelligence compétitive) |
