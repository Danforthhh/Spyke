import { DEMO_REPORT_HTML, DEMO_COMPETITOR, DEMO_PRODUCT } from '../data/demoReport'

interface Props {
  onSignUp: () => void
  onBack?: () => void
}

export default function DemoView({ onSignUp, onBack }: Props) {
  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex flex-col">

      {/* Top banner */}
      <div className="flex-shrink-0 bg-indigo-600 px-5 py-3 flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <svg viewBox="0 0 32 32" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="10" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5"/>
            <line x1="16" y1="3"    x2="16" y2="9.5"  stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="16" y1="22.5" x2="16" y2="29"   stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="3"  y1="16"   x2="9.5" y2="16"  stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="22.5" y1="16" x2="29" y2="16"   stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="16" cy="16" r="2.5" fill="rgba(255,255,255,0.9)"/>
          </svg>
          <span className="text-white font-bold text-sm tracking-tight">Spyke</span>
        </div>

        <div className="h-4 w-px bg-indigo-400 flex-shrink-0" />

        <p className="text-indigo-100 text-xs flex-1 min-w-0">
          Sample report &mdash; <strong className="text-white">{DEMO_COMPETITOR}</strong> analysed against{' '}
          <strong className="text-white">{DEMO_PRODUCT}</strong>. Sign up to run real-time analyses on any competitor.
        </p>

        <div className="flex items-center gap-2 flex-shrink-0">
          {onBack && (
            <button
              onClick={onBack}
              className="text-xs text-indigo-200 hover:text-white transition-colors cursor-pointer bg-transparent border-0"
            >
              ← Back
            </button>
          )}
          <button
            onClick={onSignUp}
            className="text-xs font-semibold px-4 py-1.5 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            Sign up free
          </button>
          <button
            onClick={onSignUp}
            className="text-xs text-indigo-200 hover:text-white transition-colors cursor-pointer bg-transparent border-0"
          >
            Sign in →
          </button>
        </div>
      </div>

      {/* Report iframe — full remaining height */}
      <iframe
        srcDoc={DEMO_REPORT_HTML}
        className="flex-1 w-full border-0 bg-white"
        title="Sample competitive report"
        sandbox="allow-scripts"
      />

    </div>
  )
}
