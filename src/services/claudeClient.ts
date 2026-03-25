/**
 * Anthropic SDK wrapper for browser usage.
 *
 * Routing:
 *   DEV mode  → dev-proxy.vin-bories.workers.dev  (Groq llama-3.3-70b + Tavily search)
 *   PROD mode → api.anthropic.com directly using the user's own Anthropic key
 *
 * Cast notes:
 * - WEB_TOOLS: web_search/web_fetch are server-side tools not present in ToolUnion → cast any
 * - thinking adaptive: type 'adaptive' not yet in SDK types → cast any
 * - pause_turn: stop_reason type incomplete in SDK → cast string
 * - Streaming: using raw SSE events (content_block_delta) instead of text_stream
 */
import Anthropic from '@anthropic-ai/sdk'

// DEV: Cloudflare Worker dev-proxy — free Groq (llama-3.3-70b) + Tavily search
const WORKER_URL_DEV = 'https://dev-proxy.vin-bories.workers.dev'
const getWorkerUrl = () => WORKER_URL_DEV

/**
 * Returns a fresh Anthropic client on every call.
 * - DEV mode: routes through the dev-proxy Worker (Groq + Tavily)
 * - PROD mode: calls api.anthropic.com directly with the user's own key
 */
function getClient(userApiKey?: string | null) {
  const isDev = localStorage.getItem('devMode') === 'true'
  if (isDev) {
    return new Anthropic({
      apiKey: 'via-worker',
      baseURL: `${getWorkerUrl()}/anthropic`,
      dangerouslyAllowBrowser: true,
    })
  }
  return new Anthropic({
    apiKey: userApiKey ?? 'missing-key',
    dangerouslyAllowBrowser: true,
  })
}

export const MODEL_WEB    = 'claude-sonnet-4-6'   // web_search/web_fetch (Haiku ne supporte pas)
export const MODEL_REPORT = 'claude-haiku-4-5'    // rapport sans web tools
export const MODEL_DEEP   = 'claude-opus-4-6'     // mode deep

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WEB_TOOLS: any[] = [
  { type: 'web_search_20260209', name: 'web_search' },
  { type: 'web_fetch_20260209', name: 'web_fetch' },
]

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
}

export function extractJson<T>(content: string): T {
  const s = content.trim()
  const blockMatch = s.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  if (blockMatch) return JSON.parse(blockMatch[1]) as T
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start !== -1 && end > start) return JSON.parse(s.slice(start, end + 1)) as T
  throw new Error(`No JSON found in response (${s.length} chars)`)
}

export async function callClaude(
  system: string,
  user: string,
  useWeb = false,
  onLog?: (msg: string) => void,
  userApiKey?: string | null,
): Promise<string> {
  const client = getClient(userApiKey)
  const model = useWeb ? MODEL_WEB : MODEL_REPORT

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: user }]
  let fullText = ''

  for (let i = 0; i < 10; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client.messages.create as any)({
      model,
      max_tokens: 8192,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages,
      ...(useWeb ? { tools: WEB_TOOLS } : {}),
    }) as Anthropic.Message

    onLog?.(`tokens in=${response.usage?.input_tokens ?? '?'} out=${response.usage?.output_tokens ?? '?'}`)
    fullText += extractText(response.content)

    if ((response.stop_reason as string) !== 'pause_turn') break
    messages.push({ role: 'assistant', content: response.content })
  }

  return fullText
}

export async function* callClaudeStreaming(
  system: string,
  user: string,
  deep = false,
  userApiKey?: string | null,
): AsyncGenerator<string> {
  const client = getClient(userApiKey)
  const model = deep ? MODEL_DEEP : MODEL_REPORT

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = (client.messages.stream as any)({
    model,
    max_tokens: 8192,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
    ...(deep ? { thinking: { type: 'adaptive' } } : {}),
  })

  // Iterate over raw SSE events
  for await (const event of stream as AsyncIterable<Anthropic.MessageStreamEvent>) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text
    }
  }
}
