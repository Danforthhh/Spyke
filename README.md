# Spyke — Competitive Intelligence

A multi-agent competitive analysis web app. Enter a SaaS B2B competitor name → get a full report with pricing, customer reviews, SWOT and recommendations.

**Live:** [danforthhh.github.io/Spyke](https://danforthhh.github.io/Spyke/)

---

## Architecture

```
                    ┌─────────────────┐
                    │   HUB (App.tsx) │
                    └────────┬────────┘
                             │ Promise.allSettled() — full isolation
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

API keys are stored as Cloudflare Worker secrets — never in the browser bundle.

---

## Local setup

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

---

## Cloudflare Worker (API proxy)

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

---

## Deploy to GitHub Pages

```bash
npm run build
npx gh-pages -d dist
```

---

## Development mode (free)

A **DEV/PROD toggle** pill lives in the top-right corner of the app. Click it to switch between:

| Mode | AI backend | Cost |
|------|-----------|------|
| **☁ PROD** | Cloudflare Worker → Claude Sonnet/Haiku/Opus | Paid per token |
| **🔧 DEV** | Local proxy → Ollama `qwen2.5:7b` + Brave Search | Free |

The pill shows live search usage: `🔧 DEV · 42/2000 🔍 · resets Apr 1`

**Setup** — see [`../dev-proxy/README.md`](../dev-proxy/README.md) for one-time Ollama installation and proxy startup instructions.

> DEV mode simulates Claude's web search tool with an agentic loop (Brave API + DuckDuckGo). Results are good for structural iteration; switch to PROD to validate analysis quality.

---

## Tech decisions

| Topic | Decision | Reason |
|---|---|---|
| Web tools | Sonnet 4.6 required | Haiku 4.5 does not support web_search/web_fetch |
| Initial report | Haiku 4.5 | No web needed, 10x cheaper |
| Deep mode | Opus 4.6 + adaptive thinking | Offered after the Haiku report |
| Parallelism | Promise.allSettled() | Full isolation — each spoke only receives competitor name |
| Prompt caching | cache_control ephemeral | Reduces cost on repeated analyses |
| Report format | HTML | Rich rendering, tables, colored SWOT, easy to share |
