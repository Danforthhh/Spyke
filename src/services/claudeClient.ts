/**
 * Wrapper Anthropic SDK pour usage browser.
 * Notes sur les casts :
 * - WEB_TOOLS : web_search/web_fetch sont des tools server-side non présents dans ToolUnion → cast any
 * - thinking adaptive : type 'adaptive' pas encore dans les types SDK → cast any
 * - pause_turn : stop_reason type SDK incomplet → cast string
 * - Streaming : on utilise les events bruts (content_block_delta) au lieu de text_stream
 */
import Anthropic from '@anthropic-ai/sdk'

export const MODEL_WEB = 'claude-sonnet-4-6'    // web_search/web_fetch (Haiku ne supporte pas)
export const MODEL_REPORT = 'claude-haiku-4-5'  // rapport sans web tools
export const MODEL_DEEP = 'claude-opus-4-6'     // mode deep

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
  throw new Error(`Aucun JSON trouvé dans la réponse (${s.length} chars)`)
}

export async function callClaude(
  apiKey: string,
  system: string,
  user: string,
  useWeb = false,
  onLog?: (msg: string) => void,
): Promise<string> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
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

    onLog?.(`tokens in=${response.usage.input_tokens} out=${response.usage.output_tokens}`)
    fullText += extractText(response.content)

    if ((response.stop_reason as string) !== 'pause_turn') break
    messages.push({ role: 'assistant', content: response.content })
  }

  return fullText
}

export async function* callClaudeStreaming(
  apiKey: string,
  system: string,
  user: string,
  deep = false,
): AsyncGenerator<string> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const model = deep ? MODEL_DEEP : MODEL_REPORT

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = (client.messages.stream as any)({
    model,
    max_tokens: 8192,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
    ...(deep ? { thinking: { type: 'adaptive' } } : {}),
  })

  // Itérer sur les événements SSE bruts
  for await (const event of stream as AsyncIterable<Anthropic.MessageStreamEvent>) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text
    }
  }
}
