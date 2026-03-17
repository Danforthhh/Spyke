# Spyke — Competitive Intelligence Pipeline

A multi-agent competitive analysis pipeline in Python with an explicit **Hub-and-Spoke** architecture.

Enter a SaaS B2B competitor name → receive a full HTML report with pricing, customer reviews, SWOT and recommendations.

---

## Architecture

```
                    ┌─────────────────┐
                    │   HUB           │
                    │ hub_coordinator │
                    └────────┬────────┘
                             │ asyncio.gather() — full isolation
           ┌─────────────────┼─────────────────┐
           │                 │                 │
    ┌──────▼──────┐  ┌───────▼──────┐  ┌──────▼──────────┐
    │  SPOKE 1    │  │   SPOKE 2    │  │    SPOKE 3      │
    │  Scraper    │  │  Sentiment   │  │  Positioning    │
    │  (Sonnet)   │  │  (Sonnet)    │  │  (Sonnet)       │
    └──────┬──────┘  └───────┬──────┘  └──────┬──────────┘
           └─────────────────┼─────────────────┘
                             │ outputs collected by the HUB
                    ┌────────▼────────┐
                    │   SPOKE 4       │
                    │  Report Writer  │
                    │  (Haiku / Opus) │
                    └─────────────────┘
```

| Component | Model | Role |
|---|---|---|
| Spoke 1 — Scraper | Sonnet 4.6 + web search | Pricing, features, recent updates |
| Spoke 2 — Sentiment | Sonnet 4.6 + web search | G2, Capterra, Reddit reviews |
| Spoke 3 — Positioning | Sonnet 4.6 + web search | SWOT vs your product |
| Spoke 4 — Report | Haiku 4.5 (or Opus 4.6 in deep mode) | HTML report |

---

## Installation

```bash
git clone https://github.com/Danforthhh/Spyke.git
cd Spyke

pip install -r requirements.txt

cp .env.example .env
# Fill in ANTHROPIC_API_KEY in .env

cp my_product.example.json my_product.json
# Fill in your product data in my_product.json
```

---

## Usage

```bash
# Standard analysis (Haiku — fast, ~2-3min)
python hub_coordinator.py "HubSpot"

# The HTML report opens automatically in your browser
# The program then offers a deeper report with Opus 4.6
```

### Test an individual spoke

```bash
python spoke_scraper.py "Salesforce"
python spoke_sentiment.py "Salesforce"
python spoke_positioning.py "Salesforce"
```

### Unit tests (no API calls)

```bash
python -m pytest tests/
```

---

## Web Frontend (React + TypeScript)

The web interface is deployed on GitHub Pages: **[danforthhh.github.io/Spyke](https://danforthhh.github.io/Spyke/)**

### Local setup

```bash
npm install
cp .env.example .env.local
# Fill in VITE_WORKER_URL in .env.local

npm run dev   # http://localhost:5173
```

### Environment variables

| Variable | Description | Example |
|---|---|---|
| `VITE_WORKER_URL` | Cloudflare Worker proxy URL | `https://spyke.xxx.workers.dev` |

### Cloudflare Worker (API proxy)

The worker stores API keys server-side — they are never included in the JS bundle.

```bash
cd worker/

# Deploy the code
npx wrangler login
npx wrangler deploy

# Set secrets (one-time)
npx wrangler secret put ANTHROPIC_API_KEY

# Update VITE_WORKER_URL in .env.local with the displayed URL
```

### Deploy to GitHub Pages

```bash
npm run build
npx gh-pages -d dist
```

---

## Sensitive files (in `.gitignore`)

| File | Content |
|---|---|
| `.env` | Anthropic API key |
| `my_product.json` | Your real product data |
| `outputs/` | Generated reports |

---

## Technical decisions

| Topic | Decision | Reason |
|---|---|---|
| Web tools | Sonnet 4.6 required | Haiku 4.5 does not support web_search/web_fetch |
| Initial report | Haiku 4.5 | No web needed, 10x cheaper |
| Deep mode | Opus 4.6 + adaptive thinking | Offered interactively after the Haiku report |
| Parallelism | asyncio.gather() | Full isolation — each spoke only receives competitor_name |
| Prompt caching | cache_control ephemeral | Reduces cost on repeated analyses |
| Report format | HTML | Rich rendering, tables, colored SWOT, easy to share |
