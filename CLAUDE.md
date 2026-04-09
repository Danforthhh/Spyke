# Spyke — Claude Code context

## Working style

**Always challenge requests** — before implementing, present 2–3 options with different trade-offs (cost, complexity, reversibility, maintenance) and highlight scenarios the user may not have considered. Let the user choose, then implement.

**Decision log discipline** — whenever a significant architectural decision is made collaboratively, record it below using this format:
```
## [Feature] — [date]
**Context:** why this came up
**Options considered:**
- Option A: ... (trade-off)
- Option B: ... (trade-off)
**Chosen:** Option X — because ...
```

**Keep docs alive** — update this CLAUDE.md as decisions are made. It is a living document, not a one-time write-up.

---

## Project overview
Competitive intelligence tool. Given a competitor name, runs 4 parallel AI "spokes" to produce a full HTML analysis report. React 19 + TypeScript + Vite + Firebase Auth + Firestore. Each user brings their own Anthropic key.

## Architecture
```
Browser (React App.tsx — Hub)
  ├─ Auth gate: Firebase Auth (email/password)
  ├─ Spoke 1: Scraper     (Sonnet + web_search) → pricing, features, recent updates
  ├─ Spoke 2: Sentiment   (Sonnet + web_search) → reviews, complaints, praises
  ├─ Spoke 3: Positioning (Sonnet + web_search) → competitor SWOT, feature gaps
  │         [Promise.allSettled — parallel, 150s timeout each]
  └─ Spoke 4: Report Writer (Haiku / Opus streaming) → full HTML report

Each spoke → claudeClient.ts → getClient(userApiKey)
                                → PROD: api.anthropic.com directly (user's own key)
                                → DEV:  dev-proxy.vin-bories.workers.dev (Groq Llama 3.3 70B + Tavily)

API key storage:
  User logs in → password → PBKDF2-SHA256 → AES key → decrypt(Firestore ciphertext) → in-memory apiKey
  Firestore: users/{uid}/settings/apiKey  { encryptedKey, keySalt, keyIv }  (AES-GCM-256 encrypted)
  sessionStorage: raw password (cleared on tab close / logout) for same-tab auto-decrypt on reload
```

## Key files
| File | Role |
|------|------|
| `src/services/firebase.ts` | Firebase init — exports `auth`, `db` |
| `src/services/cryptoService.ts` | PBKDF2-SHA256 + AES-GCM-256 encrypt/decrypt + sessionStorage password helpers |
| `src/services/firestoreService.ts` | Read/write encrypted API key bundle in Firestore |
| `src/hooks/useAuth.ts` | Firebase `onAuthStateChanged` → `{ user, loading }` |
| `src/services/claudeClient.ts` | Anthropic SDK wrapper — `callClaude()` (tool loop), `callClaudeStreaming()`, `extractJson()` |
| `src/services/spokeScraper.ts` | Spoke 1 — pricing & features JSON |
| `src/services/spokeSentiment.ts` | Spoke 2 — review sentiment JSON |
| `src/services/spokePositioning.ts` | Spoke 3 — **competitor** SWOT + feature gaps JSON |
| `src/services/spokeReport.ts` | Spoke 4 — HTML report, includes full `myProduct` context |
| `src/App.tsx` | Hub — auth gate, session state, parallel execution, timeout, product configurator |
| `src/types.ts` | `ScraperData`, `SentimentData`, `PositioningData`, `MyProduct`, `SpokesState`, `Session`, `EncryptedKeyBundle` |
| `src/components/AuthScreen.tsx` | Login / create account screen |
| `src/components/AccountModal.tsx` | Account settings overlay — API key add/edit/remove, logout |
| `src/components/UnlockModal.tsx` | Password re-entry prompt (new tab after page reload) |
| `src/components/DevModeToggle.tsx` | DEV/PROD toggle pill — blocks PROD if no API key saved |
| `src/components/SpokeLog.tsx` | Spoke status + log display — red banner on error |
| `src/components/ReportPanel.tsx` | Iframe report display — debounced streaming, `allow-scripts` sandbox |
| `.claude/agents/code-reviewer.md` | Read-only pre-deploy code reviewer — edit to change what gets flagged |
| `.claude/settings.json` | Two PreToolUse hooks: TS check on push, code review on deploy |
| `.env.local.example` | Firebase config template |

## DEV/PROD toggle
- `localStorage.devMode === 'true'` → DEV (free, online CF Worker)
- Switching to PROD requires an API key saved in the user's profile; toggle shows a tooltip if key is missing
- **`getClient()` is a factory function** — instantiates a new `Anthropic` client on each call so mode always reflects the current toggle state
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

## DEV vs PROD spoke execution
- **PROD**: `Promise.allSettled` — all 3 spokes run in parallel (Claude has no shared rate limit)
- **DEV**: sequential — each spoke awaits the previous one before starting; status updates live as each completes
- Reason: Groq free tier is 12k TPM shared across all concurrent calls; 3 parallel spokes exhaust the budget simultaneously and all time out at 150s. Sequential gives each spoke the full budget.
- UX note: DEV sequential shows a ⚡ banner on Spoke 1 and each spoke flips to done/error in real time before the next starts

## Spoke 4 failure handling
- If **all 3 research spokes fail**: Spoke 4 immediately errors with a clear message (cause + remediation)
- If **1–2 spokes fail**: Spoke 4 runs with a `⚠ N/3 spokes failed` warning log
- Timeout per spoke: **150s** (increased from 90s to accommodate Groq retry waits)

## Your product configuration
- Loaded from Firestore shared collection `products/` on login
- User's favorite product stored at `users/{uid}/settings/preferences` (`favoriteProductId` field)
- If no favorite is set, defaults to `DEFAULT_MY_PRODUCT` (FlowDesk demo)
- Picker UI: compact card + "Change" button → `ProductPicker` modal with search, favorites, add form
- Spoke 3 generates SWOT for the **competitor**, not our product

## Streaming (Spoke 4)
- `callClaudeStreaming()` uses `client.messages.stream()`, yields `content_block_delta` text events
- `ReportPanel` debounces `srcDoc` updates to 400ms intervals (prevents O(n²) DOM reflows)
- iframe has `sandbox="allow-scripts"` — `allow-same-origin` is intentionally omitted to prevent iframe scripts from accessing parent frame DOM/cookies (XSS mitigation)

## Pre-push checklist
1. `npx tsc --noEmit` — automated via `.claude/settings.json` hook; blocks push on TypeScript errors
2. Update this CLAUDE.md if architecture changed
3. `npm run deploy` — triggers isolated code-reviewer agent (`.claude/agents/code-reviewer.md`) before building; blocks on CRITICAL findings, then publishes to GitHub Pages
4. `git push`

## Automated quality gates
| Trigger | Hook type | Effect |
|---------|-----------|--------|
| `git push` | `command` PreToolUse | Runs `npx tsc --noEmit`, blocks on error |
| `npm run deploy` | `agent` PreToolUse | Runs code reviewer, blocks on CRITICAL issues |

To update review criteria: edit `.claude/agents/code-reviewer.md` — no `settings.json` change needed.

---

## Decision log

## Pre-deployment code review agent — 2026-03-24
**Context:** Needed an automated code review step before every deploy to catch critical bugs, XSS, and security issues without relying on the developer's memory.

**Options considered:**
- **Agent hook in settings.json (inline prompt)** — automatic, blocks deploy on findings, but prompt is buried in JSON and hard to iterate on.
- **Named agent in `.claude/agents/` + hook (chosen)** — review criteria live in a versioned markdown file that's easy to read and update independently; hook reads the file at runtime so changes take effect immediately; agent can also be invoked manually.
- **Git pre-push shell hook calling `claude -p`** — standard DevOps pattern, runs at push not deploy, but `.git/hooks/` is not committed so every developer has to set it up manually.

**Chosen:** Named agent definition at `.claude/agents/code-reviewer.md` + `PreToolUse` agent hook in `settings.json`
- Hook intercepts every `Bash` call; if command is not `npm run deploy`, the agent exits immediately (fast path, no review)
- If command is `npm run deploy`, agent reads `.claude/agents/code-reviewer.md` for criteria, reviews changed files via `git diff`, and either blocks (CRITICAL) or allows (HIGH/LOW)
- Review criteria are in `.claude/agents/code-reviewer.md` — update that file to change what the reviewer checks; no need to touch `settings.json`
- Agent has `tools: Bash, Read, Grep, Glob` only — cannot edit files

## Dev/prod free iteration setup — 2026-03-24
**Context:** Spyke uses Claude Sonnet (web tools) + Claude Haiku/Opus heavily. Each competitor analysis burns significant API credits, making rapid iteration expensive.

**Options considered:**
- **Ollama local + simulated web search** — free but local-only; doesn't work from other devices.
- **Groq cloud (free tier)** — always online, works from any device, no local setup. Rate-limited (12k TPM) but sufficient for iteration.

**Chosen:** Cloudflare Worker dev-proxy + Groq `llama-3.3-70b-versatile` + Tavily search
- `getClient()` factory (not singleton) so toggle takes effect immediately without restart
- Tavily usage tracked in Cloudflare KV, displayed in DEV toggle pill
- PROD mode unchanged — uses real Claude Sonnet via `spyke.vin-bories.workers.dev`

## Account management + per-user API keys — 2026-03-25
**Context:** App was stateless with no auth. Owner's Anthropic key stored as Cloudflare Worker secret. Needed multi-user accounts so each user brings their own Anthropic key.

**Options considered:**
- **localStorage-only auth** — no backend, single-device, data lost on browser clear. Simple but not "online".
- **Firebase Auth + Firestore (chosen)** — same stack as Wandr; multi-device, persistent, proper auth.
- **Cloudflare Workers KV for user storage** — would extend existing Worker but requires new JWT auth endpoints; more complex.

**Chosen:** Firebase Auth (email/password) + Firestore
- Users sign up / sign in via Firebase; no default accounts — self-service only
- API key encrypted client-side with AES-GCM-256 before writing to Firestore; key derived from login password via PBKDF2-SHA256 (100k iterations, 16-byte random salt)
- Two separate PBKDF2 salts: one for the AES key derivation (`keySalt`), ensuring no cross-derivation leakage
- Decrypted key held in React state (memory only); password persisted to `sessionStorage` for same-tab auto-decrypt on reload; cleared on logout
- PROD Worker (`spyke.vin-bories.workers.dev`) **retired** — PROD calls now go directly to `api.anthropic.com` using the user's own key; SDK already has `dangerouslyAllowBrowser: true`
- DEV Worker (`dev-proxy.vin-bories.workers.dev`) **unchanged**
- PROD mode is gated in `DevModeToggle`: if `hasApiKey === false`, clicking PROD shows a tooltip instead of toggling
- Firestore path: `users/{uid}/settings/apiKey` (document)
- Firestore path: `users/{uid}/reports/{reportId}` (auto-ID documents, saved analyses)
- Firestore security rules: users can only read/write their own data
  ```
  match /users/{uid}/settings/{doc}    { allow read, write: if request.auth.uid == uid; }
  match /users/{uid}/reports/{reportId} { allow read, write: if request.auth.uid == uid; }
  ```

**Key files added:**
- `src/services/firebase.ts` — Firebase init
- `src/services/cryptoService.ts` — PBKDF2 + AES-GCM + sessionStorage helpers
- `src/services/firestoreService.ts` — Firestore CRUD for encrypted key bundle
- `src/hooks/useAuth.ts` — Firebase auth state listener
- `src/components/AuthScreen.tsx` — Login / create account (full-screen)
- `src/components/AccountModal.tsx` — Account settings overlay (API key add/edit/remove, logout)
- `src/components/UnlockModal.tsx` — Password re-entry prompt after page reload in new tab

**Files deleted:**
- `src/components/ApiKeyModal.tsx` — legacy unused component (replaced by AccountModal)

## Account deletion — 2026-03-25
**Context:** Security gap — users had no way to fully remove their data from Firebase.

**Chosen:** Delete account button in `AccountModal` with two-step confirmation
- Step 1: "Delete account" button (muted red) → expands to warning + Confirm/Cancel
- Step 2: Re-authenticates with `sessionPassword` via `reauthenticateWithCredential` (Firebase requirement for sensitive operations)
- Deletes Firestore document (`users/{uid}/settings/apiKey`) first, then Firebase auth record
- Clears `sessionStorage` and calls `onLogout` — full wipe, nothing left behind

## Spoke status + timeout fixes — 2026-03-25
- **PROD spinner bug**: spokes 2 & 3 stayed visually `running` until all three resolved. Fixed by wrapping each spoke promise in its own `.then()` callback so status updates immediately on settlement (not after `Promise.allSettled`).
- **Spoke 1 timeout (150s)**: Claude was making up to 10 `pause_turn` web-search iterations (~20-30s each). Capped the loop at 4 iterations in `callClaude`. Also added "use at most 3 web searches" to each spoke's system prompt. Worst-case is now ~120s, within the 150s timeout.

## UX improvements — 2026-03-24
- Spoke error banner: red highlighted box when a spoke fails (was invisible in logs)
- Iframe streaming debounce: 400ms throttle on `srcDoc` updates during report generation
- Your product configurator: inline form, persisted to `localStorage`
- Spoke completion logs: `✓ Done — N tiers, M features` replaces "Extracting JSON..." as final message
- Spoke 4 failure messaging: clear error when all spokes fail, warning when partial failures
- SWOT layout: explicit 2×2 CSS grid (was overflowing to 3+1)
- SWOT subject: explicitly the **competitor's** SWOT (was generating our product's SWOT)
- Report writer: full `myProduct` data included in prompt (was only passing product name)

## Shared product database — 2026-04-09
**Context:** "Your product" was stored in localStorage (single-device, lost on browser clear). Needed a cross-user, cross-device shared product list with favorites.

**Options considered:**
- **localStorage** — simple, no Firestore reads, but local-only
- **Firestore per-user** — persistent across devices, but products not shared
- **Firestore shared collection `products/`** (chosen) — cross-user, cross-device, seedable

**Chosen:** Firestore `products/` collection (shared) + `users/{uid}/settings/preferences` (favorite)
- Any authenticated user can read or add products; only the creator can update/delete their own entries
- Seed products use `createdBy: '__system__'` to avoid false attribution
- `addSharedProduct()` validates `auth.currentUser.uid === uid` before writing (defense-in-depth)
- Input validation in `ProductPicker`: max 100 chars (name/category), 200 (tagline), 500 (positioning), 50 features
- 16 products pre-seeded on first login (ProTop + 15 mid-market SaaS tools)
- `localStorage` product config removed entirely

**Firestore rules required:**
```
match /products/{productId} {
  allow read, create: if request.auth != null;
  allow update, delete: if request.auth.uid == resource.data.createdBy;
}
```
