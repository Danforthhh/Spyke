import { useState, useEffect } from 'react'

interface Props {
  html: string
  streaming: boolean
  reportDate?: number
  onDeepAnalysis?: () => void
  deepLoading?: boolean
  /** When true, the panel renders the spinner (spokes still running, no html yet) */
  analyzing?: boolean
  competitorName?: string
}

export default function ReportPanel({ html, streaming, reportDate, onDeepAnalysis, deepLoading, analyzing, competitorName }: Props) {
  const isComplete = !streaming && html.includes('</html>')

  // Debounce iframe updates while streaming — prevents O(n²) DOM reflows
  const [displayHtml, setDisplayHtml] = useState(html)
  useEffect(() => {
    if (!streaming) { setDisplayHtml(html); return }
    const t = setTimeout(() => setDisplayHtml(html), 400)
    return () => clearTimeout(t)
  }, [html, streaming])

  const title = competitorName
    ? `${competitorName} · competitive report`
    : 'Competitive report'

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {reportDate && !streaming && (
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          )}
          {streaming && (
            <p className="text-xs text-indigo-500 mt-0.5">Generating…</p>
          )}
        </div>
        {isComplete && onDeepAnalysis && (
          <button
            onClick={onDeepAnalysis}
            disabled={deepLoading}
            className={`ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              deepLoading
                ? 'border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50'
                : 'border-indigo-300 text-indigo-600 hover:bg-indigo-50 cursor-pointer'
            }`}
          >
            {deepLoading ? 'Generating with Opus 4.6…' : '✦ Deep analysis (Opus 4.6)'}
          </button>
        )}
      </div>

      {/* Spinner — shown while spokes are running and no report yet */}
      {analyzing && !html && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 bg-white rounded-xl border border-slate-200 shadow-sm min-h-[420px]">
          {/* Ring spinner */}
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 border-r-indigo-300 animate-spin-smooth" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-slate-600">Generating report…</p>
            <p className="text-xs text-slate-400">Waiting for research spokes</p>
          </div>
          {/* Skeleton lines */}
          <div className="w-full max-w-xs space-y-2 px-4">
            <div className="h-2 rounded-full animate-shimmer" style={{ width: '72%' }} />
            <div className="h-2 rounded-full animate-shimmer" style={{ width: '90%', animationDelay: '.1s' }} />
            <div className="h-2 rounded-full animate-shimmer" style={{ width: '58%', animationDelay: '.2s' }} />
            <div className="h-2 rounded-full animate-shimmer" style={{ width: '80%', animationDelay: '.3s' }} />
            <div className="h-2 rounded-full animate-shimmer" style={{ width: '65%', animationDelay: '.4s' }} />
          </div>
        </div>
      )}

      {/* Streaming spinner — report is being written */}
      {streaming && !displayHtml && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 bg-white rounded-xl border border-indigo-100 shadow-sm min-h-[420px]">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-100" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin-smooth" />
          </div>
          <p className="text-sm font-medium text-slate-600">Writing report…</p>
        </div>
      )}

      {/* Report iframe */}
      {displayHtml && (
        <iframe
          srcDoc={displayHtml}
          className="flex-1 w-full min-h-[420px] border border-slate-200 rounded-xl bg-white shadow-sm"
          title="Competitive report"
          sandbox="allow-scripts"
        />
      )}

      {/* Download buttons */}
      {isComplete && (
        <div className="flex gap-2 mt-2 flex-shrink-0">
          <button
            onClick={() => {
              const blob = new Blob([html], { type: 'text/html' })
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = 'competitive-report.html'
              a.click()
            }}
            className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors cursor-pointer"
          >
            Download HTML
          </button>
          <button
            onClick={() => {
              const win = window.open('', '_blank')
              if (!win) return
              win.document.write(html)
              win.document.close()
              win.addEventListener('load', () => { win.focus(); win.print() })
            }}
            className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors cursor-pointer"
          >
            Export PDF
          </button>
        </div>
      )}
    </div>
  )
}
