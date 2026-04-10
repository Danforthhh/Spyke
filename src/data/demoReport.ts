/**
 * Hardcoded sample report shown on the demo/onboarding screen.
 * Scenario: FlowDesk (fictional B2B SaaS CRM) analysing HubSpot as competitor.
 * Matches the HTML structure and CSS classes produced by spokeReport.ts so users
 * see exactly what a real Spyke report looks like before they sign up.
 */
export const DEMO_COMPETITOR = 'HubSpot'
export const DEMO_PRODUCT    = 'FlowDesk'

export const DEMO_REPORT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>HubSpot — Competitive Report</title>
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
.exec p{font-size:14px;line-height:1.75;color:#374151;margin-bottom:12px}
.exec p:last-child{margin-bottom:0}
table{width:100%;border-collapse:collapse;font-size:13px}
thead tr th{background:#1e2235;color:#fff;padding:11px 14px;text-align:left;font-weight:600;font-size:11.5px;letter-spacing:.2px}
thead tr th:first-child{border-radius:8px 0 0 8px}
thead tr th:last-child{border-radius:0 8px 8px 0}
tbody tr td{padding:10px 14px;border-bottom:1px solid #f0f2f8;color:#374151;vertical-align:top}
tbody tr:last-child td{border-bottom:none}
tbody tr:nth-child(even) td{background:#fafbff}
tbody tr:hover td{background:#f4f5ff}
.table-note{font-size:11.5px;color:#94a3b8;margin-top:10px}
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
    <h1>HubSpot vs FlowDesk — Competitive Analysis</h1>
    <div class="pill">Intelligence Report</div>
    <p class="meta">Analysis generated on April 10, 2026 &nbsp;·&nbsp; Data reflects web sources as of this date and may not capture recent changes.</p>
  </div>

  <div class="card exec">
    <div class="section-title">Executive Summary</div>
    <p>HubSpot dominates the SMB CRM and marketing automation market with a freemium funnel that converts aggressively across the $20–$3,600/month range. Its platform breadth — CRM, Marketing Hub, Sales Hub, Service Hub, and CMS — creates strong lock-in but introduces complexity that mid-market buyers increasingly cite as a pain point.</p>
    <p>Reviews on G2 and Capterra consistently highlight pricing shock as users scale: seats and contact limits compound non-linearly, with customers reporting 3–5× cost increases at growth inflection points. HubSpot's "value for money" score on G2 has declined 8 points year-over-year — a clear positioning vector FlowDesk can own in competitive content and sales cycles. FlowDesk's strategic window lies in transparent seat-based pricing with no contact caps and a faster, more opinionated onboarding path.</p>
  </div>

  <div class="card">
    <div class="section-title">Pricing Analysis</div>
    <table>
      <thead><tr><th>Tier</th><th>HubSpot (Sales Hub)</th><th>FlowDesk</th><th>Verdict</th></tr></thead>
      <tbody>
        <tr>
          <td>Free</td>
          <td>$0 · 1M contacts, HubSpot branding, 200 emails/mo</td>
          <td>$0 · 500 contacts, core pipeline</td>
          <td>HubSpot free tier is broader; FlowDesk free is simpler</td>
        </tr>
        <tr>
          <td>Starter</td>
          <td>$20/mo · 1,000 contacts (+$61/mo per 1K overage)</td>
          <td>$29/mo · Unlimited contacts</td>
          <td><span class="bl">FlowDesk wins</span> — no overage risk</td>
        </tr>
        <tr>
          <td>Professional</td>
          <td>$890/mo · 2,000 contacts + $3,000 mandatory onboarding</td>
          <td>$99/mo · All features, no onboarding fee</td>
          <td><span class="bl">FlowDesk wins</span> — 9× cheaper at entry</td>
        </tr>
        <tr>
          <td>Enterprise</td>
          <td>$3,600/mo · 10,000 contacts + $10,000 mandatory onboarding</td>
          <td>Custom · Unlimited contacts</td>
          <td><span class="bl">FlowDesk wins</span> — no onboarding tax</td>
        </tr>
      </tbody>
    </table>
    <p class="table-note">Pricing captured April 2026 · HubSpot Sales Hub · USD · per-seat + contact overage model</p>
  </div>

  <div class="card">
    <div class="section-title">Feature Comparison</div>
    <table>
      <thead><tr><th>Feature</th><th>FlowDesk</th><th>HubSpot</th><th>Priority</th></tr></thead>
      <tbody>
        <tr><td>Contact-limit pricing</td><td><span class="check">✓</span> Unlimited all tiers</td><td><span class="cross">✗</span> Overage fees apply</td><td><span class="bh">High</span></td></tr>
        <tr><td>Mandatory onboarding fee</td><td><span class="check">✓</span> $0</td><td><span class="cross">✗</span> $3K–$10K required</td><td><span class="bh">High</span></td></tr>
        <tr><td>Time to first pipeline</td><td><span class="check">✓</span> &lt; 1 day</td><td><span class="partial">Partial</span> 2–4 weeks</td><td><span class="bh">High</span></td></tr>
        <tr><td>Email sequences</td><td><span class="check">✓</span> All tiers</td><td><span class="check">✓</span> Starter+</td><td><span class="bl">Parity</span></td></tr>
        <tr><td>Built-in CMS / landing pages</td><td><span class="cross">✗</span></td><td><span class="check">✓</span> Professional+</td><td><span class="bm">Medium</span></td></tr>
        <tr><td>Full marketing automation</td><td><span class="partial">Partial</span> Basic workflows</td><td><span class="check">✓</span> Professional+</td><td><span class="bh">High</span></td></tr>
        <tr><td>Pipeline customization</td><td><span class="check">✓</span></td><td><span class="check">✓</span></td><td><span class="bl">Parity</span></td></tr>
        <tr><td>AI deal scoring</td><td><span class="cross">✗</span> Roadmap Q3</td><td><span class="check">✓</span> Enterprise only</td><td><span class="bm">Medium</span></td></tr>
        <tr><td>Native reporting dashboards</td><td><span class="check">✓</span> All tiers</td><td><span class="check">✓</span> Professional+</td><td><span class="bl">Parity</span></td></tr>
        <tr><td>One-click data import</td><td><span class="check">✓</span> CSV + HubSpot</td><td><span class="check">✓</span></td><td><span class="bl">Parity</span></td></tr>
      </tbody>
    </table>
  </div>

  <div class="card">
    <div class="section-title">Competitor SWOT — HubSpot</div>
    <div class="swot-grid">
      <div class="swot-card sw-s">
        <h4>Strengths</h4>
        <ul>
          <li>Brand synonymous with inbound marketing in SMB</li>
          <li>Freemium funnel — low CAC, high LTV at scale</li>
          <li>1,500+ integrations and App Marketplace</li>
          <li>All-in-one reduces vendor sprawl under 50 seats</li>
          <li>$500M+ invested in HubSpot AI (Breeze)</li>
        </ul>
      </div>
      <div class="swot-card sw-w">
        <h4>Weaknesses</h4>
        <ul>
          <li>Contact-based pricing penalises fast-growing lists</li>
          <li>Platform complexity — 70% of features unused</li>
          <li>Mandatory onboarding fees block SMB sales</li>
          <li>G2 "value for money" score down 8 pts YoY</li>
          <li>Configuration overhead — weeks to first value</li>
        </ul>
      </div>
      <div class="swot-card sw-o">
        <h4>Opportunities for FlowDesk</h4>
        <ul>
          <li>Win "HubSpot refugees" at the 25–200 seat stage</li>
          <li>Price transparency as a core positioning pillar</li>
          <li>Own time-to-value: 1 day vs HubSpot's weeks</li>
          <li>Target 2,400+ reviews citing "too expensive to scale"</li>
          <li>Public cost calculator showing true scale pricing</li>
        </ul>
      </div>
      <div class="swot-card sw-t">
        <h4>Threats to FlowDesk</h4>
        <ul>
          <li>HubSpot free tier creates deep data lock-in</li>
          <li>AI investment widening feature gap over 18–24 mo</li>
          <li>10K+ sales reps outguns FlowDesk's lean GTM</li>
          <li>Acquisitions (Clearbit, etc.) deepen the moat</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="section-title">Strategic Recommendations</div>
    <ul class="rec-list">
      <li class="rec-item">
        <div class="rec-num">1</div>
        <div class="rec-body">
          <strong>Lead with pricing transparency across all marketing.</strong>
          Build a public "HubSpot vs FlowDesk true cost" calculator showing real spend at 5K, 20K, and 50K contacts. Contact overages are the #1 complaint in HubSpot reviews — this is a winnable positioning battleground backed by hard data.
        </div>
      </li>
      <li class="rec-item">
        <div class="rec-num">2</div>
        <div class="rec-body">
          <strong>Target the scaling pain moment with paid search.</strong>
          HubSpot customers experience sticker shock at Free→Starter and Starter→Pro transitions. Run campaigns on "HubSpot too expensive", "HubSpot pricing increase", and "HubSpot contact limit" — all high-intent migration queries with comparatively low CPCs.
        </div>
      </li>
      <li class="rec-item">
        <div class="rec-num">3</div>
        <div class="rec-body">
          <strong>Build a one-click HubSpot migration wizard.</strong>
          HubSpot data export (contacts, deals, email history) is available via API. Eliminating the migration objection removes the #1 conversion blocker at mid-funnel and directly counters HubSpot's primary retention tactic: data lock-in.
        </div>
      </li>
    </ul>
  </div>

</div>
</body>
</html>`
