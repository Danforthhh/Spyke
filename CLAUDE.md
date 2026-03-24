# Spyke — Claude Code context

## Project overview
Competitive intelligence tool. Given a competitor name, runs 4 parallel AI "spokes" to produce a full HTML analysis report. React 18 + TypeScript + Vite. No backend DB — report rendered in-browser.

## Architecture
```
Browser (React App.tsx — Hub)
  ├─ Spoke 1: Scraper     (Sonnet + web_search) → pricing, features, recent updates
  ├─ Spoke 2: Sentiment   (Sonnet + web_search) → reviews, complaints, praises
  ├─ Spoke 3: Positioning (Sonnet + web_search) → competitor SWOT, feature gaps
  │         [Promise.allSettled — parallel, 150s timeout each]
  └─ Spoke 4: Report Writer (Haiku / Opus streaming) → full HTML report

Each spoke → claudeClient.ts → getClient() → getWorkerUrl()
                                           → PROD: spyke.vin-bories.workers.dev   (Claude Sonnet + real web tools)
                                           → DEV:  dev-proxy.vin-bories.workers.dev (Groq Llama 3.3 70B + Tavily)
```

## Key files
| File | Role |
|------|------|
| `src/services/claudeClient.ts` | Anthropic SDK wrapper — `callClaude()` (tool loop), `callClaudeStreaming()`, `extractJson()` |
| `src/services/spokeScraper.ts` | Spoke 1 — pricing & features JSON |
| `src/services/spokeSentiment.ts` | Spoke 2 — review sentiment JSON |
| `src/services/spokePositioning.ts` | Spoke 3 — **competitor** SWOT + feature gaps JSON |
| `src/services/spokeReport.ts` | Spoke 4 — HTML report, includes full `myProduct` context |
| `src/App.tsx` | Hub — parallel execution, timeout, spoke 4 failure messaging, product configurator |
| `src/types.ts` | `ScraperData`, `SentimentData`, `PositioningData`, `MyProduct`, `SpokesState` |
| `src/components/DevModeToggle.tsx` | DEV/PROD toggle pill — polls `/stats` every 5s |
| `src/components/SpokeLog.tsx` | Spoke status + log display — red banner on error |
| `src/components/ReportPanel.tsx` | Iframe report display — debounced streaming, `allow-scripts` sandbox |

## DEV/PROD toggle
- `localStorage.devMode === 'true'` → DEV (free, online CF Worker)
- `getWorkerUrl()` in `claudeClient.ts` — read per call (not module-level)
- **`getClient()` is a factory function** — instantiates a new `Anthropic` client on each call so `baseURL` always reflects the current toggle state
- Toggle polls `GET https://dev-proxy.vin-bories.workers.dev/stats` — shows Tavily usage (tracked via Cloudflare KV)

## Web search in DEV mode
Spokes 1–3 send `web_search_20260209` + `web_fetch_20260209` tools. In DEV mode the dev-proxy simulates this with an agentic loop:
1. Injects a JSON tool-call protocol into the system prompt
2. Model outputs `{"__tool__":"web_search","query":"..."}` markers (bare lines or in code fences — both handled)
3. Worker executes real searches via Tavily (primary) or DuckDuckGo HTML (fallback), increments KV counter
4. Injects results back, loops up to 6 iterations (2048 tokens/iteration to stay within Groq 12k TPM)
5. Returns single `end_turn` response — Spyke's `pause_turn` loop runs exactly once
6. On Groq 429 rate limit: reads `retry-after` header, waits exact duration, retries up to 3×

**DEV quality note:** Groq Llama 3.3 70B is lower quality than Claude Sonnet for structured research. Use DEV to verify the pipeline works; use PROD for real analyses.

## Spoke 4 failure handling
- If **all 3 research spokes fail**: Spoke 4 immediately errors with a clear message (cause + remediation)
- If **1–2 spokes fail**: Spoke 4 runs with a `⚠ N/3 spokes failed` warning log
- Timeout per spoke: **150s** (increased from 90s to accommodate Groq retry waits)

## Your product configuration
- Stored in `localStorage` under key `spyke_my_product`
- Falls back to `DEFAULT_MY_PRODUCT` (FlowDesk demo) if not set
- Configurable via `▸ YOUR PRODUCT` collapsible above the competitor input
- Spoke 3 generates SWOT for the **competitor**, not our product

## Streaming (Spoke 4)
- `callClaudeStreaming()` uses `client.messages.stream()`, yields `content_block_delta` text events
- `ReportPanel` debounces `srcDoc` updates to 400ms intervals (prevents O(n²) DOM reflows)
- iframe has `sandbox="allow-same-origin allow-scripts"` — scripts in generated reports are allowed

## Pre-push checklist
1. `npx tsc --noEmit` (automated via `.claude/settings.json` hook — blocks push on failure)
2. Update this CLAUDE.md if architecture changed
3. `npm run deploy` to publish to GitHub Pages

---

## Decision log

## Dev/prod free iteration setup — 2026-03-24
**Context:** Spyke uses Claude Sonnet (web tools) + Claude Haiku/Opus heavily. Each competitor analysis burns significant API credits, making rapid iteration expensive.

**Options considered:**
- **Ollama local + simulated web search** — free but local-only; doesn't work from other devices.
- **Groq cloud (free tier)** — always online, works from any device, no local setup. Rate-limited (12k TPM) but sufficient for iteration.

**Chosen:** Cloudflare Worker dev-proxy + Groq `llama-3.3-70b-versatile` + Tavily search
- `getClient()` factory (not singleton) so toggle takes effect immediately without restart
- Tavily usage tracked in Cloudflare KV, displayed in DEV toggle pill
- PROD mode unchanged — uses real Claude Sonnet via `spyke.vin-bories.workers.dev`

## UX improvements — 2026-03-24
- Spoke error banner: red highlighted box when a spoke fails (was invisible in logs)
- Iframe streaming debounce: 400ms throttle on `srcDoc` updates during report generation
- Your product configurator: inline form, persisted to `localStorage`
- Spoke completion logs: `✓ Done — N tiers, M features` replaces "Extracting JSON..." as final message
- Spoke 4 failure messaging: clear error when all spokes fail, warning when partial failures
- SWOT layout: explicit 2×2 CSS grid (was overflowing to 3+1)
- SWOT subject: explicitly the **competitor's** SWOT (was generating our product's SWOT)
- Report writer: full `myProduct` data included in prompt (was only passing product name)
