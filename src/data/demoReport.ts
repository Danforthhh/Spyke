/**
 * Hardcoded sample report shown on the demo/onboarding screen.
 * Scenario: FlowDesk (fictional B2B SaaS CRM) analysing HubSpot as competitor.
 * Matches the HTML structure produced by spokeReport.ts so users see exactly
 * what a real Spyke report looks like before they sign up.
 */
export const DEMO_COMPETITOR = 'HubSpot'
export const DEMO_PRODUCT    = 'FlowDesk'

export const DEMO_REPORT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HubSpot — Competitive Report</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;max-width:900px;margin:0 auto;padding:0;background:#f8f9fa;color:#333;line-height:1.6}
  .rh{background:#1a1a2e;color:#e0e0e0;padding:28px 36px}
  .rh h1{margin:0 0 4px;font-size:22px;font-weight:700;color:#fff}
  .rh .meta{font-size:12px;color:#888}
  .sec{padding:28px 36px;border-bottom:1px solid #e8e8e8;background:#fff}
  .sec:last-child{border-bottom:none}
  h2{font-size:14px;font-weight:700;color:#1a1a2e;margin:0 0 16px;text-transform:uppercase;letter-spacing:.5px}
  p{margin:0 0 12px;font-size:14px}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:4px}
  th{background:#1a1a2e;color:#fff;padding:8px 12px;text-align:left;font-weight:600}
  td{padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top}
  tr:last-child td{border-bottom:none}
  tr:nth-child(even) td{background:#f9f9f9}
  .swot{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .sb{padding:16px;border-radius:8px}
  .sb h3{margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
  .sb ul{margin:0;padding-left:18px;font-size:13px}
  .sb li{margin-bottom:5px}
  .str{background:#d4edda} .wk{background:#f8d7da} .op{background:#cce5ff} .th{background:#fff3cd}
  ol{padding-left:20px;font-size:14px}
  ol li{margin-bottom:10px}
  .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600}
  .bh{background:#f8d7da;color:#721c24} .bm{background:#fff3cd;color:#856404} .bl{background:#d4edda;color:#155724}
  .note{font-size:12px;color:#888;margin-top:8px}
</style>
</head>
<body>
<div class="rh">
  <h1>HubSpot — Competitive Intelligence Report</h1>
  <div class="meta">vs FlowDesk &nbsp;·&nbsp; April 10, 2026 &nbsp;·&nbsp; Sample report</div>
</div>

<div class="sec">
  <h2>Executive Summary</h2>
  <p>HubSpot dominates the SMB CRM and marketing automation market with a freemium funnel that converts aggressively across the $20–$3,600/month range. Its platform breadth (CRM + Marketing + Sales + Service + CMS) creates strong lock-in but introduces complexity that mid-market buyers increasingly cite as a pain point. Reviews on G2 and Capterra highlight pricing shock as users scale — seats and contact limits compound non-linearly, with many customers reporting 3–5× cost increases at growth inflection points.</p>
  <p>FlowDesk's strategic window lies in transparent seat-based pricing with no contact caps and a tighter, more opinionated workflow that removes the configuration overhead HubSpot demands. HubSpot's G2 "value for money" score has declined 8 points year-over-year — a positioning vector FlowDesk can own directly in competitive content and sales cycles.</p>
</div>

<div class="sec">
  <h2>Pricing Analysis</h2>
  <table>
    <thead><tr><th>Tier</th><th>Price / mo</th><th>Contacts</th><th>Key limitations</th></tr></thead>
    <tbody>
      <tr><td>Free</td><td>$0</td><td>1,000,000</td><td>HubSpot branding on all assets, 200 email sends/mo, no sequences</td></tr>
      <tr><td>Starter</td><td>$20</td><td>1,000</td><td>$61/mo per 1K additional contacts, basic automation only</td></tr>
      <tr><td>Professional</td><td>$890</td><td>2,000</td><td>$50/mo per 1K add'l contacts, mandatory $3,000 onboarding fee</td></tr>
      <tr><td>Enterprise</td><td>$3,600</td><td>10,000</td><td>Custom SSO, advanced permissions — mandatory $10,000 onboarding fee</td></tr>
    </tbody>
  </table>
  <p class="note">Pricing captured April 2026 · HubSpot Sales Hub · USD · per-seat + contact overage model</p>
</div>

<div class="sec">
  <h2>Feature Comparison — HubSpot vs FlowDesk</h2>
  <table>
    <thead><tr><th>Feature</th><th>HubSpot</th><th>FlowDesk</th><th>Strategic priority</th></tr></thead>
    <tbody>
      <tr><td>Contact-limit pricing</td><td>Yes — overage charges apply</td><td>No — unlimited contacts</td><td><span class="badge bh">High</span></td></tr>
      <tr><td>Onboarding fee</td><td>$3K–$10K (mandatory)</td><td>$0</td><td><span class="badge bh">Differentiator</span></td></tr>
      <tr><td>Time to first pipeline</td><td>2–4 weeks</td><td>&lt; 1 day</td><td><span class="badge bh">Differentiator</span></td></tr>
      <tr><td>Email sequences</td><td>✓ Starter+</td><td>✓</td><td><span class="badge bl">Parity</span></td></tr>
      <tr><td>Built-in CMS / landing pages</td><td>✓ Professional+</td><td>✗</td><td><span class="badge bm">Medium</span></td></tr>
      <tr><td>Full marketing automation</td><td>✓ (Professional+)</td><td>✗ Basic only</td><td><span class="badge bh">Gap</span></td></tr>
      <tr><td>Pipeline customization</td><td>✓</td><td>✓</td><td><span class="badge bl">Parity</span></td></tr>
      <tr><td>AI deal scoring</td><td>✓ Enterprise only</td><td>✗</td><td><span class="badge bm">Medium</span></td></tr>
      <tr><td>Native reporting dashboards</td><td>✓ (Pro+)</td><td>✓ (all tiers)</td><td><span class="badge bl">Parity</span></td></tr>
    </tbody>
  </table>
</div>

<div class="sec">
  <h2>Competitor SWOT — HubSpot</h2>
  <div class="swot">
    <div class="sb str">
      <h3>Strengths</h3>
      <ul>
        <li>Brand synonymous with inbound marketing in the SMB segment</li>
        <li>Freemium funnel converts at scale — low CAC, high lifetime value</li>
        <li>Ecosystem: 1,500+ integrations, App Marketplace, HubSpot Academy</li>
        <li>All-in-one reduces vendor sprawl for teams under 50 seats</li>
        <li>$500M+ invested in HubSpot AI (Breeze) — widening feature moat</li>
      </ul>
    </div>
    <div class="sb wk">
      <h3>Weaknesses</h3>
      <ul>
        <li>Contact-based pricing penalises fast-growing lists disproportionately</li>
        <li>Platform complexity — 70% of features go unused per published analytics</li>
        <li>Mandatory onboarding fees ($3K–$10K) create hard stops in SMB sales</li>
        <li>G2 "value for money" score declining: 4.1 → 3.8 over 12 months</li>
        <li>Configuration overhead — average time-to-value measured in weeks</li>
      </ul>
    </div>
    <div class="sb op">
      <h3>Opportunities for FlowDesk</h3>
      <ul>
        <li>Win "HubSpot refugees" at the 25–200 seat growth stage</li>
        <li>Price transparency as a core positioning pillar — no surprises at scale</li>
        <li>1-day onboarding story vs HubSpot's weeks — own time-to-value</li>
        <li>Target HubSpot reviews citing "too expensive to scale" (2,400+ reviews)</li>
        <li>Build a public pricing calculator showing true cost at 5K, 20K, 50K contacts</li>
      </ul>
    </div>
    <div class="sb th">
      <h3>Threats to FlowDesk</h3>
      <ul>
        <li>HubSpot free tier creates high switching costs through data lock-in</li>
        <li>AI investment ($500M+) will widen the feature gap over 18–24 months</li>
        <li>Sales force of 10K+ reps outguns FlowDesk's lean GTM motion</li>
        <li>HubSpot acquisition of complementary tools (e.g. Clearbit) deepens moat</li>
      </ul>
    </div>
  </div>
</div>

<div class="sec">
  <h2>Strategic Recommendations</h2>
  <ol>
    <li><strong>Lead with pricing transparency across all marketing.</strong> Build a public "HubSpot vs FlowDesk true cost" calculator. Contact overages are the #1 complaint in HubSpot reviews — this is a winnable positioning battleground with clear data to back it up.</li>
    <li><strong>Target the scaling pain moment.</strong> HubSpot customers experience sticker shock at the Free→Starter and Starter→Pro transitions. Run paid search on "HubSpot too expensive", "HubSpot pricing increase" and "HubSpot contact limit" — these are high-intent migration queries.</li>
    <li><strong>Eliminate onboarding friction entirely.</strong> Offer a "live in 24 hours" guarantee backed by a money-back policy. HubSpot's mandatory $3K onboarding fee is a hard stop for sub-50 seat teams and a strong conversion argument for FlowDesk's sales team.</li>
    <li><strong>Build a one-click HubSpot migration wizard.</strong> HubSpot data export (contacts, deals, email history) is available via API. Removing the migration objection ("I have too much data in HubSpot to switch") removes the #1 conversion blocker at mid-funnel.</li>
    <li><strong>Invest in G2 presence on "HubSpot alternative" and comparison pages.</strong> These pages capture 30–40% of SaaS evaluation traffic at the SMB tier and have significantly lower CPC than direct branded keywords.</li>
  </ol>
</div>
</body>
</html>`
