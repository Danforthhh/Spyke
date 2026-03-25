import { useState, useEffect } from 'react'

interface Props {
  html: string
  streaming: boolean
  onDeepAnalysis?: () => void
  deepLoading?: boolean
}

export default function ReportPanel({ html, streaming, onDeepAnalysis, deepLoading }: Props) {
  const isComplete = !streaming && html.includes('</html>')

  // Debounce iframe updates while streaming — prevents O(n²) DOM reflows
  const [displayHtml, setDisplayHtml] = useState(html)
  useEffect(() => {
    if (!streaming) { setDisplayHtml(html); return }
    const t = setTimeout(() => setDisplayHtml(html), 400)
    return () => clearTimeout(t)
  }, [html, streaming])

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: '#e0e0e0', fontSize: 19 }}>
          Report generated {streaming && <span style={{ color: '#6c63ff', fontSize: 14 }}>— generating...</span>}
        </h2>
        {isComplete && onDeepAnalysis && (
          <button
            onClick={onDeepAnalysis}
            disabled={deepLoading}
            style={{
              marginLeft: 'auto', padding: '8px 18px',
              background: deepLoading ? '#2a2a4a' : 'transparent',
              border: '1px solid #6c63ff', borderRadius: 6, color: deepLoading ? '#666' : '#6c63ff',
              fontSize: 13, cursor: deepLoading ? 'not-allowed' : 'pointer', fontWeight: 600,
            }}
          >
            {deepLoading ? 'Generating with Opus 4.6...' : '✦ Deep analysis with Opus 4.6'}
          </button>
        )}
      </div>

      {/* HTML rendered in sandboxed iframe — uses debounced displayHtml to avoid streaming thrash */}
      {displayHtml && (
        <iframe
          srcDoc={displayHtml}
          style={{
            width: '100%', height: 700, border: '1px solid #1e1e3a',
            borderRadius: 8, background: '#fff',
          }}
          title="Competitive report"
          sandbox="allow-scripts"
        />
      )}

      {/* Download buttons */}
      {isComplete && (
        <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
          <button
            onClick={() => {
              const blob = new Blob([html], { type: 'text/html' })
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = 'competitive-report.html'
              a.click()
            }}
            style={{
              padding: '8px 18px', background: '#1e1e3a', border: '1px solid #2a2a4a',
              borderRadius: 6, color: '#bbb', fontSize: 13, cursor: 'pointer',
            }}
          >
            Download HTML
          </button>
          <button
            onClick={() => {
              // Open in a new tab and trigger the browser's print-to-PDF dialog
              const win = window.open('', '_blank')
              if (!win) return
              win.document.write(html)
              win.document.close()
              win.addEventListener('load', () => { win.focus(); win.print() })
            }}
            style={{
              padding: '8px 18px', background: '#1e1e3a', border: '1px solid #2a2a4a',
              borderRadius: 6, color: '#bbb', fontSize: 13, cursor: 'pointer',
            }}
          >
            Export PDF
          </button>
        </div>
      )}
    </div>
  )
}
