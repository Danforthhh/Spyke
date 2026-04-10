// ARCHITECTURAL ROLE: COMPARISON REPORT SPOKE
// Inputs  : array of CompetitorAnalysis (each with scraper/sentiment/positioning results)
//           + myProduct
// Outputs : full HTML comparison report (streamed chunk by chunk)
// Unlike individual spokes, this spoke does NO web research — it is pure synthesis.

import { callClaudeStreaming } from './claudeClient'
import type { CompetitorAnalysis, MyProduct } from '../types'

const SYSTEM = `You are an expert in competitive intelligence and B2B executive communication.
Generate a complete, self-contained HTML multi-competitor comparison report using the design system below. The report must look premium and polished — like a professional analyst brief.

Required sections (in order):
1. Executive Summary — 3–5 sentences on the overall competitive landscape and where each competitor stands
2. Pricing Comparison — table: Tier row per product (our product + each competitor as columns)
3. Feature Matrix — Feature | Us | [CompetitorA] | [CompetitorB] ... | Priority
   Use ✓/✗/Partial; Priority badge per row
4. Sentiment Snapshot — one row per competitor: Rating /5 | Reviews | Top Complaint | Top Praise
5. Competitor SWOT — for each competitor, four labeled sections (Strengths / Weaknesses / Opportunities / Threats)
   Use a VERTICAL single-column layout per competitor (NOT a 2×2 grid — too wide for 3+ competitors)
6. Strategic Recommendations — numbered ranked list of cross-competitor opportunities for our product

Use this exact HTML/CSS skeleton (fill in the content, keep the classes):

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Comparison Report</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:#f0f2f8;color:#1e2235;line-height:1.5}
.wrap{max-width:960px;margin:0 auto;padding:32px 20px 64px}
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
.unavail{color:#94a3b8;font-style:italic;font-size:12px}
.swot-block{margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid #f0f2f8}
.swot-block:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
.swot-block h3{font-size:13px;font-weight:700;color:#1e2235;margin-bottom:12px}
.swot-rows{display:flex;flex-direction:column;gap:8px}
.swot-tag{border-radius:8px;padding:12px 16px;display:flex;align-items:flex-start;gap:10px}
.swot-tag .label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;width:90px;flex-shrink:0;padding-top:1px}
.swot-tag ul{padding-left:14px;margin:0}
.swot-tag li{font-size:12.5px;line-height:1.6;color:#374151;margin-bottom:2px}
.st-s{background:#f0fdf4}.st-s .label{color:#15803d}
.st-w{background:#fff1f2}.st-w .label{color:#b91c1c}
.st-o{background:#eff6ff}.st-o .label{color:#1d4ed8}
.st-t{background:#fffbeb}.st-t .label{color:#b45309}
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
.score{font-weight:700;color:#6c63ff}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>[CompA] vs [CompB] vs [OurProduct] — Competitive Comparison</h1>
    <div class="pill">Multi-Competitor Analysis</div>
    <p class="meta">Analysis generated on [DATE] · Data reflects web sources as of this date and may not capture recent changes.</p>
  </div>

  <div class="card exec">
    <div class="section-title">Executive Summary</div>
    <p>[overview paragraph]</p>
  </div>

  <div class="card">
    <div class="section-title">Pricing Comparison</div>
    <table><thead><tr><th>Tier</th><th>Our Product</th><th>[CompA]</th><th>[CompB]</th></tr></thead>
    <tbody>[rows]</tbody></table>
  </div>

  <div class="card">
    <div class="section-title">Feature Matrix</div>
    <table><thead><tr><th>Feature</th><th>Us</th><th>[CompA]</th><th>[CompB]</th><th>Priority</th></tr></thead>
    <tbody>[rows — use <span class="check">✓</span>/<span class="cross">✗</span>/<span class="partial">Partial</span> and <span class="bh">High</span>/<span class="bm">Medium</span>/<span class="bl">Low</span> badges]</tbody></table>
  </div>

  <div class="card">
    <div class="section-title">Sentiment Snapshot</div>
    <table><thead><tr><th>Competitor</th><th>Rating</th><th>Reviews</th><th>Top Complaint</th><th>Top Praise</th></tr></thead>
    <tbody>[rows]</tbody></table>
  </div>

  <div class="card">
    <div class="section-title">Competitor SWOT</div>
    <!-- Repeat .swot-block for each competitor -->
    <div class="swot-block">
      <h3>[Competitor Name]</h3>
      <div class="swot-rows">
        <div class="swot-tag st-s"><span class="label">Strengths</span><ul>[items]</ul></div>
        <div class="swot-tag st-w"><span class="label">Weaknesses</span><ul>[items]</ul></div>
        <div class="swot-tag st-o"><span class="label">Opportunities</span><ul>[items]</ul></div>
        <div class="swot-tag st-t"><span class="label">Threats</span><ul>[items]</ul></div>
      </div>
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

Fill in all [PLACEHOLDER] content with real data. Keep every CSS class exactly as shown. If a competitor's data is marked DATA UNAVAILABLE, show <span class="unavail">Data unavailable</span> in those cells. Return ONLY the complete HTML, starting with <!DOCTYPE html>.`

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
