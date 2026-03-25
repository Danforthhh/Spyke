// ARCHITECTURAL ROLE: SPOKE 4 (Report Writer)
// Inputs  : outputs from 3 spokes (via hub), competitor_name, myProduct
// Outputs : full HTML report (streamed chunk by chunk)

import { callClaudeStreaming } from './claudeClient'
import type { ScraperData, SentimentData, PositioningData, MyProduct } from '../types'

const SYSTEM = `You are an expert in competitive intelligence and B2B executive communication.
Generate a complete, self-contained HTML report (inline CSS) ready for presentation.

Required structure:
1. Executive Summary (5 lines max)
2. Pricing Analysis (comparison table: competitor tiers vs our tiers — use "Our Product" section data directly, never say "spoke failed" for our pricing)
3. Feature Comparison Table (Feature | Us | Competitor | Priority)
4. Competitor SWOT (the COMPETITOR's strengths/weaknesses/opportunities/threats — NOT ours)
5. Strategic Recommendations for us (exactly 3 bullets)

Style:
- Font: system-ui, sans-serif; max-width 900px centered
- Header: background #1a1a2e, white text
- SWOT: strict 2×2 CSS grid (display:grid; grid-template-columns:1fr 1fr; gap:16px)
  Colors: Strengths=#d4edda, Weaknesses=#f8d7da, Opportunities=#cce5ff, Threats=#fff3cd
- Tables with alternating row colors
Return ONLY the complete HTML, starting with <!DOCTYPE html>.`

function buildPrompt(
  competitor: string,
  scraper: ScraperData | null,
  sentiment: SentimentData | null,
  positioning: PositioningData | null,
  myProduct: MyProduct,
): string {
  const parts = [
    `# Report: ${competitor} vs ${myProduct.name}\n`,
    `## Our Product (use this data directly — do NOT say "spoke failed")\n\`\`\`json\n${JSON.stringify(myProduct, null, 2)}\n\`\`\``,
  ]

  parts.push(scraper
    ? `## Spoke 1 — Pricing & Features\n\`\`\`json\n${JSON.stringify(scraper, null, 2)}\n\`\`\``
    : '## Spoke 1 — Pricing & Features\n**DATA UNAVAILABLE**')

  parts.push(sentiment
    ? `## Spoke 2 — Sentiment\n\`\`\`json\n${JSON.stringify(sentiment, null, 2)}\n\`\`\``
    : '## Spoke 2 — Sentiment\n**DATA UNAVAILABLE**')

  parts.push(positioning
    ? `## Spoke 3 — Positioning\n\`\`\`json\n${JSON.stringify(positioning, null, 2)}\n\`\`\``
    : '## Spoke 3 — Positioning\n**DATA UNAVAILABLE**')

  return parts.join('\n\n')
}

export async function* runReport(
  competitor: string,
  scraper: ScraperData | null,
  sentiment: SentimentData | null,
  positioning: PositioningData | null,
  myProduct: MyProduct,
  deep = false,
  userApiKey?: string | null,
): AsyncGenerator<string> {
  const user = buildPrompt(competitor, scraper, sentiment, positioning, myProduct)
  yield* callClaudeStreaming(SYSTEM, user, deep, userApiKey)
}
