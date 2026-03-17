# Spyke — Architectural rules

## Architecture: HUB-AND-SPOKE

This project implements a multi-agent competitive analysis pipeline with an **explicit** Hub-and-Spoke architecture. Each component has a unique and non-negotiable role.

### The HUB (`hub_coordinator.py`)
- **SINGLE responsibility**: receive input, dispatch to spokes in parallel, collect results, call the synthesis spoke.
- The hub **does NOT** perform analysis itself.
- The hub **does NOT** pass one spoke's results to another spoke.
- Each spoke works in **ISOLATION**.

### The SPOKES
| File | Role | Input | Output |
|---|---|---|---|
| `spoke_scraper.py` | Web Scraper | `competitor_name` | `{pricing_tiers, features_list, recent_updates}` |
| `spoke_sentiment.py` | Sentiment Analyst | `competitor_name` | `{avg_score, top_complaints, top_praises, sample_quotes}` |
| `spoke_positioning.py` | Positioning Analyst | `competitor_name` + `my_product.json` | `{feature_gaps, pricing_position, swot}` |
| `spoke_report.py` | Report Writer | outputs from 3 spokes (via hub) | HTML report |

### Absolute rules
1. A spoke **never** receives another spoke's output.
2. The hub **never** makes a direct Claude call.
3. Each spoke logs: start, end, token count.
4. If a spoke fails, the hub continues and mentions the failure in the report.

---

## Required environment variables

```bash
ANTHROPIC_API_KEY=sk-ant-...   # Anthropic API key (in .env, never committed)
```

Copy `.env.example` → `.env` and fill in the key.

---

## Models used

| Mode | Model | Usage |
|---|---|---|
| Standard (default) | `claude-haiku-4-5` | Spokes 1-3 + initial report |
| Deep (`--deep` / interactive) | `claude-opus-4-6` + adaptive thinking | Deep report only |

**Decision**: Haiku for the first pass (fast, ~15s, 10x cheaper).
Opus offered after the Haiku report if the user wants to go deeper.

---

## Usage commands

```bash
# Setup
pip install -r requirements.txt
cp .env.example .env          # then fill in ANTHROPIC_API_KEY
cp my_product.example.json my_product.json  # then fill in your product data

# Analyze a competitor
python hub_coordinator.py "HubSpot"

# Test an individual spoke
python spoke_scraper.py "Salesforce"
python spoke_sentiment.py "Salesforce"
python spoke_positioning.py "Salesforce"

# Unit tests
python -m pytest tests/
```

---

## Sensitive files — NEVER COMMIT

| File | Sensitive content |
|---|---|
| `.env` | Anthropic API key |
| `my_product.json` | Real product data (pricing, roadmap, positioning) |
| `outputs/` | Generated reports (competitive intelligence) |
