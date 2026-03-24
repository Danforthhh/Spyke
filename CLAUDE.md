# Spyke — Claude Code context

## Project overview
Competitive intelligence tool. Given a competitor name, runs 4 parallel AI "spokes" to produce a full HTML analysis report. React 18 + TypeScript + Vite + Tailwind. No backend DB — report rendered in-browser.

## Architecture
```
Browser (React App.tsx — Hub)
  ├─ Spoke 1: Scraper   (Sonnet + web_search) → pricing, features, recent updates
  ├─ Spoke 2: Sentiment (Sonnet + web_search) → reviews, complaints, praises
  ├─ Spoke 3: Positioning (Sonnet + web_search) → SWOT, feature gaps
  │         [Promise.allSettled — parallel, 90s timeout each]
  └─ Spoke 4: Report Writer (Haiku / Opus streaming) → full HTML report

Each spoke → claudeClient.ts → getClient() → getWorkerUrl()
                                           → Cloudflare Worker (PROD)
                                           → localhost:8788    (DEV)
                                                └─ Ollama qwen2.5:7b
                                                └─ Brave / DuckDuckGo (simulated tool loop)
```

## Key files
| File | Role |
|------|------|
| `src/services/claudeClient.ts` | Anthropic SDK wrapper — `callClaude()` (tool loop), `callClaudeStreaming()` |
| `src/services/spokeScraper.ts` | Spoke 1 prompt + orchestration |
| `src/services/spokeSentiment.ts` | Spoke 2 prompt + orchestration |
| `src/services/spokePositioning.ts` | Spoke 3 prompt + orchestration |
| `src/services/spokeReport.ts` | Spoke 4 prompt + streaming |
| `src/App.tsx` | Hub — parallel execution, timeout logic, UI state |
| `src/types.ts` | `ScraperData`, `SentimentData`, `PositioningData`, `SpokesState` |
| `src/components/DevModeToggle.tsx` | DEV/PROD toggle pill |
| `worker/index.js` | Cloudflare Worker proxy (production) |

## DEV/PROD toggle
- `localStorage.devMode === 'true'` → DEV (free, local proxy on port 8788)
- `getWorkerUrl()` in `claudeClient.ts` — read per call (not module-level)
- **`getClient()` is a factory function** (not a singleton) — instantiates a new `Anthropic` client on each call so the `baseURL` always reflects the current toggle state
- Toggle component: `src/components/DevModeToggle.tsx` — same as Wandr, polls `GET http://localhost:8788/stats`

## Web search in DEV mode
Spyke's Spokes 1–3 send `web_search_20260209` + `web_fetch_20260209` tools to Claude. In DEV mode, the local proxy simulates this with an agentic loop:
1. Injects a tool-call protocol into the system prompt (`{"__tool__":"web_search","query":"..."}`)
2. Parses tool call markers from Ollama's response
3. Executes real searches via Brave API (primary) or DuckDuckGo HTML (fallback)
4. Injects results back as context, loops up to 10 iterations
5. Returns a single `end_turn` response — Spyke's `pause_turn` loop runs exactly once

Result quality is lower than Claude's native web tools but sufficient for iteration.

## Streaming (Spoke 4)
`callClaudeStreaming()` uses `client.messages.stream()` and iterates over `content_block_delta` SSE events. In DEV mode, the proxy translates Ollama's NDJSON stream into Anthropic SSE format.

---

## Decision log

## Dev/prod free iteration setup — 2026-03-24
**Context:** Spyke uses Claude Sonnet (web tools) + Claude Haiku/Opus heavily. Each competitor analysis burns significant API credits, making rapid iteration expensive.

**Options considered:**
- **OpenRouter / Groq free cloud tiers** — easy swap, but rate limits could be hit during a development session. Still requires paying for web search quality.
- **Ollama local + mock web search** — free, but without web search the research spokes return outdated/hallucinated data. Not useful for testing quality.
- **Ollama local + real web search via free API** — free LLM inference + Brave Search API (2000/month free) for real web data. Chosen.

**Chosen:** Ollama (`qwen2.5:7b`) + Brave Search API (2000/month) + DuckDuckGo HTML fallback
- `getClient()` is a factory (not singleton) so the toggle takes effect immediately without restart
- Port 8788 to avoid Wrangler dev server conflict
- `num_ctx: 16384` set in proxy (Ollama default 4096 too small for multi-iteration tool loops)
- Search count displayed in UI pill with monthly limit and reset date
- **Brave → Tavily swap (2026-03-24):** Brave removed free tier; Tavily (1000/month) chosen as replacement
