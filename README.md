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
| Spoke 3 — Positioning | Sonnet 4.6 + web search | Competitor SWOT + feature gaps |
| Spoke 4 — Report | Haiku 4.5 (or Opus 4.6 in deep mode) | HTML report |

API keys are stored as Cloudflare Worker secrets — never in the browser bundle.

---

## Local setup

```bash
npm install
npm run dev   # http://localhost:5173
```

No API keys needed locally — the app routes through a Cloudflare Worker.

---

## Deploy to GitHub Pages

```bash
npm run deploy   # builds + publishes via gh-pages
```

---

## DEV / PROD toggle

A **DEV · PROD pill** lives in the top-right corner. Click it to switch AI backends at runtime — no restart needed.

| Mode | AI backend | Cost |
|------|-----------|------|
| **☁ PROD** | `spyke.vin-bories.workers.dev` → Claude Sonnet + web tools | Paid per token |
| **🔧 DEV** | `dev-proxy.vin-bories.workers.dev` → Groq Llama 3.3 70B + Tavily | Free |

The pill shows live Tavily usage: `🔧 DEV · 42/1000 🔍 · resets Apr 1`

> DEV mode uses Groq for free iteration — good for testing the pipeline. Switch to PROD to validate final quality.

---

## Cloudflare Worker (PROD API gateway)

Stores API keys server-side — never in the JS bundle.

```bash
cd worker/
npx wrangler deploy
npx wrangler secret put ANTHROPIC_API_KEY
```

---

## Tech decisions

| Topic | Decision | Reason |
|---|---|---|
| Web tools | Sonnet 4.6 required | Haiku 4.5 does not support web_search/web_fetch |
| Initial report | Haiku 4.5 | No web needed, 10x cheaper |
| Deep mode | Opus 4.6 + adaptive thinking | Offered after the Haiku report |
| Parallelism | Promise.allSettled() | Full isolation — each spoke only receives competitor name |
| Report format | HTML | Rich rendering, tables, colored SWOT, easy to share |
| Spoke timeout | 150s | Accommodates Groq retry waits (up to 3× on rate limit) |
