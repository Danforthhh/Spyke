// ARCHITECTURAL ROLE: COMPARISON REPORT SPOKE
// Inputs  : array of CompetitorAnalysis (each with scraper/sentiment/positioning results)
//           + myProduct
// Outputs : full HTML comparison report (streamed chunk by chunk)
// Unlike individual spokes, this spoke does NO web research — it is pure synthesis.

import { callClaudeStreaming } from './claudeClient'
import type { CompetitorAnalysis, MyProduct } from '../types'

const SYSTEM = `You are an expert in competitive intelligence and B2B executive communication.
Generate a complete, self-contained HTML comparison report (inline CSS) covering multiple competitors side by side.

Required sections (in order):
1. Executive Summary — 3–4 sentences describing the overall competitive landscape and where each competitor stands
2. Pricing Comparison — table with competitors (and our product) as columns, pricing tiers as rows
3. Feature Matrix — features as rows, one column per competitor showing ✓ / ✗ / Partial, plus a Strategic Priority column
4. Sentiment Snapshot — one row per competitor: avg score /5, review count, top complaint, top praise
5. Competitor SWOT — for each competitor, a condensed vertical list of strengths/weaknesses/opportunities/threats
   (use a single-column layout per competitor, NOT a 2×2 grid — the grid is too wide for 3+ competitors)
6. Strategic Recommendations — ranked numbered list of opportunities for our product, synthesized across all competitors

Style rules:
- Font: system-ui, sans-serif; max-width: 960px; margin: 0 auto
- Header: background #1a1a2e, white text. Show all competitor names in the title.
  Below the title, add in small muted text: "Analysis generated on [DATE] · Data reflects web sources as of this date."
- Section headers: font-size 14px, font-weight 700, text-transform uppercase, letter-spacing .5px, color #1a1a2e
- Tables: border-collapse collapse, alternating row background #f9f9f9
- Table header: background #1a1a2e, color #fff
- SWOT per competitor: use colored background divs with labels
  Strengths=#d4edda, Weaknesses=#f8d7da, Opportunities=#cce5ff, Threats=#fff3cd
- Badges for priority: High=#f8d7da/red, Medium=#fff3cd/amber, Low/Parity=#d4edda/green
- If a competitor's data is marked DATA UNAVAILABLE, show a muted "Data unavailable" cell rather than omitting the row

Return ONLY the complete HTML, starting with <!DOCTYPE html>.`

function buildPrompt(
  competitors: CompetitorAnalysis[],
  myProduct: MyProduct,
  analysisDate: string,
  focus?: string,
): string {
  const names = competitors.map(c => c.name).join(' vs ')
  const focusLine = focus ? `Focus area: ${focus}\n` : ''

  const parts: string[] = [
    `# Comparison Report: ${names} vs ${myProduct.name}\nAnalysis date: ${analysisDate}\n${focusLine}`,
    `## Our Product (use this data directly)\n\`\`\`json\n${JSON.stringify(myProduct, null, 2)}\n\`\`\``,
  ]

  for (const c of competitors) {
    parts.push(`---\n## Competitor: ${c.name}`)

    parts.push(c.scraper
      ? `### Scraper — Pricing & Features\n\`\`\`json\n${JSON.stringify(c.scraper, null, 2)}\n\`\`\``
      : `### Scraper — Pricing & Features\n**DATA UNAVAILABLE**`)

    parts.push(c.sentiment
      ? `### Sentiment\n\`\`\`json\n${JSON.stringify(c.sentiment, null, 2)}\n\`\`\``
      : `### Sentiment\n**DATA UNAVAILABLE**`)

    parts.push(c.positioning
      ? `### Positioning & SWOT\n\`\`\`json\n${JSON.stringify(c.positioning, null, 2)}\n\`\`\``
      : `### Positioning & SWOT\n**DATA UNAVAILABLE**`)
  }

  return parts.join('\n\n')
}

export async function* runComparisonReport(
  competitors: CompetitorAnalysis[],
  myProduct: MyProduct,
  userApiKey?: string | null,
  focus?: string,
): AsyncGenerator<string> {
  const analysisDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const user = buildPrompt(competitors, myProduct, analysisDate, focus)
  yield* callClaudeStreaming(SYSTEM, user, false, userApiKey)
}
