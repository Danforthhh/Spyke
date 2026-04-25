// ARCHITECTURAL ROLE: SPOKE 4 (Report Writer)
// Inputs  : outputs from 3 spokes (via hub), competitor_name, myProduct
// Outputs : full HTML report (streamed chunk by chunk)

import { callClaudeStreaming } from './claudeClient'
import type { ScraperData, SentimentData, PositioningData, MyProduct, CustomerDataContext } from '../types'

const SYSTEM = `You are an expert in competitive intelligence and B2B executive communication.
Generate a complete, self-contained HTML report using the exact design system below. The report must look premium and polished — like a professional analyst brief.

Required sections (in order):
1. Executive Summary — 3–5 sentences on the competitive landscape and key takeaways
2. Pricing Analysis — table: Tier | Competitor Price & Details | Our Price & Details | Verdict
3. Feature Comparison — table: Feature | Us (✓/✗/Partial) | Competitor (✓/✗/Partial) | Priority (badge)
4. Competitor SWOT — the COMPETITOR's SWOT (NOT ours); strict 2×2 grid with colored cards
5. Strategic Recommendations — numbered list of exactly 3 items for our product team

Use this exact HTML/CSS skeleton (fill in the content, keep the classes):

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Competitive Report</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:#f0f2f8;color:#1e2235;line-height:1.5}
.wrap{max-width:900px;margin:0 auto;padding:32px 20px 64px}
.header{background:linear-gradient(135deg,#0f0f23 0%,#1a1a3e 65%,#12122a 100%);color:#fff;padding:36px 40px;border-radius:16px;margin-bottom:24px;position:relative;overflow:hidden}
.header::after{content:'';position:absolute;top:-50px;right:-50px;width:220px;height:220px;border-radius:50%;background:rgba(108,99,255,.1);pointer-events:none}
.header h1{font-size:22px;font-weight:700;letter-spacing:-.3px;margin-bottom:6px}
.header .meta{color:rgba(255,255,255,.45);font-size:11.5px;margin-top:12px}
.header .pill{display:inline-flex;align-items:center;gap:5px;background:rgba(108,99,255,.22);border:1px solid rgba(108,99,255,.35);color:#b8b0ff;font-size:11px;padding:3px 10px;border-radius:20px;margin-top:10px}
.card{background:#fff;border-radius:14px;padding:28px 32px;margin-bottom:18px;box-shadow:0 1px 3px rgba(0,0,0,.06),0 4px 18px rgba(0,0,0,.04);border:1px solid #e8eaf0}
.section-title{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.9px;color:#6c63ff;margin-bottom:18px;display:flex;align-items:center;gap:8px}
.section-title::before{content:'';display:block;width:3px;height:14px;background:#6c63ff;border-radius:2px;flex-shrink:0}
.exec p{font-size:14px;line-height:1.75;color:#374151}
table{width:100%;border-collapse:collapse;font-size:13px}
thead tr th{background:#1e2235;color:#fff;padding:11px 14px;text-align:left;font-weight:600;font-size:11.5px;letter-spacing:.2px}
thead tr th:first-child{border-radius:8px 0 0 8px}
thead tr th:last-child{border-radius:0 8px 8px 0}
tbody tr td{padding:10px 14px;border-bottom:1px solid #f0f2f8;color:#374151;vertical-align:top}
tbody tr:last-child td{border-bottom:none}
tbody tr:nth-child(even) td{background:#fafbff}
tbody tr:hover td{background:#f4f5ff}
.swot-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.swot-card{border-radius:10px;padding:18px 20px}
.swot-card h4{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;margin-bottom:10px}
.swot-card ul{padding-left:16px}
.swot-card li{font-size:13px;line-height:1.65;margin-bottom:3px;color:#374151}
.sw-s{background:#f0fdf4;border-left:3px solid #22c55e}.sw-s h4{color:#15803d}
.sw-w{background:#fff1f2;border-left:3px solid #ef4444}.sw-w h4{color:#b91c1c}
.sw-o{background:#eff6ff;border-left:3px solid #3b82f6}.sw-o h4{color:#1d4ed8}
.sw-t{background:#fffbeb;border-left:3px solid #f59e0b}.sw-t h4{color:#b45309}
.rec-list{list-style:none}
.rec-item{display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid #f0f2f8}
.rec-item:last-child{border-bottom:none}
.rec-num{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#6c63ff,#8b5cf6);color:#fff;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.rec-body{font-size:13.5px;line-height:1.65;color:#374151}
.rec-body strong{color:#1e2235;display:block;margin-bottom:2px}
.bh{background:#fee2e2;color:#dc2626;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:600}
.bm{background:#fef3c7;color:#d97706;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:600}
.bl{background:#dcfce7;color:#16a34a;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:600}
.check{color:#16a34a;font-weight:700}
.cross{color:#dc2626;font-weight:700}
.partial{color:#d97706;font-weight:600}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>[COMPETITOR] vs [OUR PRODUCT] — Competitive Analysis</h1>
    <div class="pill">Intelligence Report</div>
    <p class="meta">Analysis generated on [DATE] · Data reflects web sources as of this date and may not capture recent changes.</p>
  </div>

  <div class="card exec">
    <div class="section-title">Executive Summary</div>
    <p>[3–5 sentence overview]</p>
  </div>

  <div class="card">
    <div class="section-title">Pricing Analysis</div>
    <table><thead><tr><th>Tier</th><th>Competitor</th><th>Our Product</th><th>Verdict</th></tr></thead>
    <tbody>[rows]</tbody></table>
  </div>

  <div class="card">
    <div class="section-title">Feature Comparison</div>
    <table><thead><tr><th>Feature</th><th>Us</th><th>Competitor</th><th>Priority</th></tr></thead>
    <tbody>[rows — use <span class="check">✓</span> / <span class="cross">✗</span> / <span class="partial">Partial</span> and <span class="bh">High</span>/<span class="bm">Medium</span>/<span class="bl">Low</span> badges]</tbody></table>
  </div>

  <div class="card">
    <div class="section-title">Competitor SWOT — [COMPETITOR]</div>
    <div class="swot-grid">
      <div class="swot-card sw-s"><h4>Strengths</h4><ul>[items]</ul></div>
      <div class="swot-card sw-w"><h4>Weaknesses</h4><ul>[items]</ul></div>
      <div class="swot-card sw-o"><h4>Opportunities</h4><ul>[items]</ul></div>
      <div class="swot-card sw-t"><h4>Threats</h4><ul>[items]</ul></div>
    </div>
  </div>

  <div class="card">
    <div class="section-title">Strategic Recommendations</div>
    <ul class="rec-list">
      <li class="rec-item"><div class="rec-num">1</div><div class="rec-body"><strong>[Title]</strong>[Description]</div></li>
      <li class="rec-item"><div class="rec-num">2</div><div class="rec-body"><strong>[Title]</strong>[Description]</div></li>
      <li class="rec-item"><div class="rec-num">3</div><div class="rec-body"><strong>[Title]</strong>[Description]</div></li>
    </ul>
  </div>
</div>
</body>
</html>
\`\`\`

Fill in all [PLACEHOLDER] content with real data from the research inputs. Keep every CSS class exactly as shown. Return ONLY the complete HTML, starting with <!DOCTYPE html>.`

function buildPrompt(
  competitor: string,
  scraper: ScraperData | null,
  sentiment: SentimentData | null,
  positioning: PositioningData | null,
  myProduct: MyProduct,
  analysisDate: string,
  focus?: string,
  customerData?: CustomerDataContext,
): string {
  const focusLine = focus ? `Focus area for this report: ${focus}\n` : ''
  const parts = [
    `# Report: ${competitor} vs ${myProduct.name}\nAnalysis date: ${analysisDate}\n${focusLine}`,
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

  if (customerData) {
    parts.push(
      `## Customer Data (uploaded by user)\n` +
      `File: ${customerData.fileName} (${customerData.rowCount} entries)\n` +
      `Summary: ${customerData.rawSummary}\n\n` +
      `${customerData.insights}\n\n` +
      `IMPORTANT: Integrate these first-party insights into the Executive Summary and Strategic Recommendations. ` +
      `Reference specific numbers (e.g. "you lost X deals to ${competitor} citing Y") where available.`
    )
  }

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
  focus?: string,
  customerData?: CustomerDataContext,
): AsyncGenerator<string> {
  const analysisDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const user = buildPrompt(competitor, scraper, sentiment, positioning, myProduct, analysisDate, focus, customerData)
  yield* callClaudeStreaming(SYSTEM, user, deep, userApiKey)
}
