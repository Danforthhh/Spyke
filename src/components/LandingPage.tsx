import { DEMO_REPORT_HTML } from '../data/demoReport'

interface Props {
  onGetStarted: () => void
  onViewDemo:   () => void
}

const CrosshairLogo = ({ size = 32, color = '#6c63ff' }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="10" fill="none" stroke={color} strokeWidth="1.5"/>
    <line x1="16" y1="3"    x2="16" y2="9.5"  stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="16" y1="22.5" x2="16" y2="29"   stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="3"  y1="16"   x2="9.5" y2="16"  stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="22.5" y1="16" x2="29" y2="16"   stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="16" cy="16" r="2.5" fill={color}/>
  </svg>
)

const Check = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mt-0.5">
    <circle cx="8" cy="8" r="8" fill="#6c63ff" opacity="0.15"/>
    <path d="M4.5 8l2.5 2.5 4.5-5" stroke="#6c63ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const FEATURES = [
  {
    icon: '⚡',
    title: 'Multi-agent research',
    desc: 'Scraper, sentiment, and positioning agents run in parallel — full research in under 3 minutes.',
  },
  {
    icon: '📊',
    title: 'Pricing & feature matrix',
    desc: 'Side-by-side comparison tables across every pricing tier and feature, vs your own product.',
  },
  {
    icon: '🎯',
    title: 'Competitor SWOT',
    desc: 'Structured strengths, weaknesses, opportunities, and threats — in a shareable format.',
  },
  {
    icon: '🆚',
    title: 'Compare mode',
    desc: 'Analyze 2–4 competitors simultaneously in one unified comparison report.',
  },
  {
    icon: '📤',
    title: 'Export anywhere',
    desc: 'Download as HTML or PDF, copy as Markdown, or paste directly into Google Docs.',
  },
  {
    icon: '🔒',
    title: 'Private by default',
    desc: 'API keys are encrypted in your browser with AES-256. Nothing is stored on our servers.',
  },
]

const STEPS = [
  {
    n: '1',
    title: 'Enter a competitor',
    desc: 'Type any company name. Spyke works for any B2B or B2C software product.',
  },
  {
    n: '2',
    title: 'AI agents research',
    desc: '4 specialized agents scrape pricing pages, review sites, and positioning data in parallel.',
  },
  {
    n: '3',
    title: 'Get your report',
    desc: 'A full, shareable HTML brief — ready to paste in your next board slide or sales call.',
  },
]

const FREE_FEATURES  = ['5 reports / month', 'Groq Llama 3.3 70B', 'All export formats', 'Compare mode']
const PRO_FEATURES   = ['Unlimited reports', 'Claude Sonnet 4.6', 'All export formats', 'Compare mode', 'Priority support']

export default function LandingPage({ onGetStarted, onViewDemo }: Props) {
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CrosshairLogo size={28}/>
            <span className="text-sm font-bold tracking-tight">Spyke</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onGetStarted}
              className="text-sm text-slate-400 hover:text-white transition-colors cursor-pointer bg-transparent border-0"
            >
              Sign in
            </button>
            <button
              onClick={onGetStarted}
              className="text-sm font-semibold px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-full transition-colors cursor-pointer border-0"
            >
              Get started free
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 px-6 text-center overflow-hidden">
        {/* Glow orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"/>
        <div className="absolute top-20 left-1/4 w-[300px] h-[200px] bg-violet-600/10 blur-[80px] rounded-full pointer-events-none"/>

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"/>
            Competitive intelligence, powered by Claude AI
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            Know your competitors.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              Win more deals.
            </span>
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed max-w-xl mx-auto mb-10">
            Spyke researches any competitor and generates a full intelligence report in under 3 minutes —
            pricing, features, sentiment, SWOT, and strategic recommendations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors cursor-pointer border-0 text-base shadow-lg shadow-indigo-900/50"
            >
              Get started free
            </button>
            <button
              onClick={onViewDemo}
              className="w-full sm:w-auto px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-colors cursor-pointer text-base"
            >
              See a live demo →
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Free tier included · No credit card · Bring your own API key for unlimited reports
          </p>
        </div>
      </section>

      {/* ── Demo report embed ────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">A full intelligence brief — generated in minutes</h2>
            <p className="text-slate-400 text-sm">Every report includes pricing analysis, feature comparison, SWOT, and strategic recommendations</p>
          </div>

          {/* Browser chrome wrapper */}
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60">
            {/* Fake browser bar */}
            <div className="bg-[#1a1a2e] px-4 py-3 flex items-center gap-3 border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60"/>
                <div className="w-3 h-3 rounded-full bg-yellow-500/60"/>
                <div className="w-3 h-3 rounded-full bg-green-500/60"/>
              </div>
              <div className="flex-1 bg-white/5 rounded-md px-3 py-1 text-xs text-slate-500 font-mono text-center">
                spyke.app · HubSpot vs FlowDesk — Competitive Report
              </div>
            </div>
            {/* Report iframe */}
            <iframe
              srcDoc={DEMO_REPORT_HTML}
              sandbox="allow-scripts"
              className="w-full"
              style={{ height: '620px', border: 'none', display: 'block', background: '#fff' }}
              title="Sample competitive intelligence report"
            />
          </div>
          <p className="text-center text-xs text-slate-500 mt-3">
            ↑ Real AI-generated report — HubSpot vs FlowDesk (sample)
          </p>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="px-6 pb-24 bg-[#0d0d1f]">
        <div className="max-w-4xl mx-auto pt-20">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold mb-2">How it works</h2>
            <p className="text-slate-400 text-sm">From competitor name to full report in 3 steps</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 relative">
            {/* Connector lines (desktop only) */}
            <div className="hidden sm:block absolute top-7 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-px bg-gradient-to-r from-indigo-500/20 via-indigo-500/40 to-indigo-500/20"/>

            {STEPS.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-2xl font-black text-indigo-400 mb-4 relative z-10">
                  {step.n}
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto pt-20">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold mb-2">Everything you need to understand the competition</h2>
            <p className="text-slate-400 text-sm">Built for product teams, GTM, and sales enablement</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-indigo-500/30 hover:bg-white/[0.05] transition-all"
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section className="px-6 pb-24 bg-[#0d0d1f]">
        <div className="max-w-3xl mx-auto pt-20">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold mb-2">Simple pricing</h2>
            <p className="text-slate-400 text-sm">Start free. Scale when you need Claude-quality reports.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Free card */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col">
              <div className="mb-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Free</div>
                <div className="text-4xl font-extrabold">$0</div>
                <div className="text-xs text-slate-500 mt-1">No credit card required</div>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {FREE_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check/>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onGetStarted}
                className="w-full py-2.5 rounded-xl border border-white/10 text-sm font-semibold hover:bg-white/5 transition-colors cursor-pointer bg-transparent"
              >
                Start free
              </button>
            </div>

            {/* Pro card */}
            <div className="p-6 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex flex-col relative overflow-hidden">
              <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                Best quality
              </div>
              <div className="mb-4">
                <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">Pro</div>
                <div className="text-4xl font-extrabold">BYOK</div>
                <div className="text-xs text-slate-400 mt-1">Bring your own Anthropic key</div>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {PRO_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-200">
                    <Check/>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onGetStarted}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition-colors cursor-pointer border-0"
              >
                Add API key →
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-600 mt-5">
            Your Anthropic API key is encrypted with AES-256 in your browser — never stored on our servers.
          </p>
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-2xl mx-auto pt-20 text-center">
          <div className="relative p-10 rounded-3xl bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-transparent border border-indigo-500/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent pointer-events-none"/>
            <CrosshairLogo size={40} color="#818cf8"/>
            <h2 className="text-2xl font-bold mt-4 mb-3">
              Ready to outpace the competition?
            </h2>
            <p className="text-slate-400 text-sm mb-8">
              5 free reports/month. No credit card. Setup in 30 seconds.
            </p>
            <button
              onClick={onGetStarted}
              className="px-10 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors cursor-pointer border-0 text-base shadow-lg shadow-indigo-900/50"
            >
              Get started free
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <CrosshairLogo size={22}/>
            <span className="text-sm text-slate-400">Competitive intelligence, powered by AI</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-slate-500">
            <a
              href="https://github.com/Danforthhh/Spyke"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              GitHub
            </a>
            <button
              onClick={onGetStarted}
              className="hover:text-slate-300 transition-colors cursor-pointer bg-transparent border-0 text-xs text-slate-500"
            >
              Sign in
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
