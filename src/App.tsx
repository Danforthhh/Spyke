import { useState, useCallback } from 'react'
import SpokeLog from './components/SpokeLog'
import ReportPanel from './components/ReportPanel'
import type { SpokesState, ScraperData, SentimentData, PositioningData, MyProduct } from './types'
import { DEFAULT_MY_PRODUCT } from './types'
import { runScraper } from './services/spokeScraper'
import { runSentiment } from './services/spokeSentiment'
import { runPositioning } from './services/spokePositioning'
import { runReport } from './services/spokeReport'
import DevModeToggle from './components/DevModeToggle'

const LS_KEY = 'spyke_my_product'

function loadMyProduct(): MyProduct {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return { ...DEFAULT_MY_PRODUCT, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return DEFAULT_MY_PRODUCT
}

function saveMyProduct(p: MyProduct) {
  localStorage.setItem(LS_KEY, JSON.stringify(p))
}

const INITIAL_SPOKES: SpokesState = {
  scraper: { status: 'idle', log: [] },
  sentiment: { status: 'idle', log: [] },
  positioning: { status: 'idle', log: [] },
  report: { status: 'idle', log: [] },
}

export default function App() {
  const [competitor, setCompetitor] = useState('')
  const [spokes, setSpokes] = useState<SpokesState>(INITIAL_SPOKES)
  const [reportHtml, setReportHtml] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [deepLoading, setDeepLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [myProduct, setMyProduct] = useState<MyProduct>(loadMyProduct)
  const [showProductConfig, setShowProductConfig] = useState(false)
  const [lastResults, setLastResults] = useState<{
    scraper: ScraperData | null
    sentiment: SentimentData | null
    positioning: PositioningData | null
  } | null>(null)

  const updateSpoke = useCallback((
    spoke: keyof SpokesState,
    patch: Partial<SpokesState[keyof SpokesState]>,
  ) => {
    setSpokes(prev => ({ ...prev, [spoke]: { ...prev[spoke], ...patch } }))
  }, [])

  const addLog = useCallback((spoke: keyof SpokesState, msg: string) => {
    setSpokes(prev => ({
      ...prev,
      [spoke]: { ...prev[spoke], log: [...prev[spoke].log, msg] },
    }))
  }, [])

  const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timeout (${ms / 1000}s)`)), ms)
      ),
    ])

  const handleAnalyze = async () => {
    if (!competitor.trim() || running) return
    setRunning(true)
    setSpokes(INITIAL_SPOKES)
    setReportHtml('')
    setLastResults(null)

    // Run 3 spokes in parallel (full isolation — each only receives competitor name)
    updateSpoke('scraper', { status: 'running' })
    updateSpoke('sentiment', { status: 'running' })
    updateSpoke('positioning', { status: 'running' })

    const TIMEOUT = 150_000
    const [scraperResult, sentimentResult, positioningResult] = await Promise.allSettled([
      withTimeout(runScraper(competitor, msg => addLog('scraper', msg)), TIMEOUT, 'Scraper'),
      withTimeout(runSentiment(competitor, msg => addLog('sentiment', msg)), TIMEOUT, 'Sentiment'),
      withTimeout(runPositioning(competitor, myProduct, msg => addLog('positioning', msg)), TIMEOUT, 'Positioning'),
    ])

    const scraper = scraperResult.status === 'fulfilled' ? scraperResult.value : null
    const sentiment = sentimentResult.status === 'fulfilled' ? sentimentResult.value : null
    const positioning = positioningResult.status === 'fulfilled' ? positioningResult.value : null

    updateSpoke('scraper', { status: scraper ? 'done' : 'error' })
    updateSpoke('sentiment', { status: sentiment ? 'done' : 'error' })
    updateSpoke('positioning', { status: positioning ? 'done' : 'error' })

    const errMsg = (r: unknown) => r instanceof Error ? r.message : String(r)
    if (scraperResult.status === 'rejected') addLog('scraper', `Error: ${errMsg(scraperResult.reason)}`)
    if (sentimentResult.status === 'rejected') addLog('sentiment', `Error: ${errMsg(sentimentResult.reason)}`)
    if (positioningResult.status === 'rejected') addLog('positioning', `Error: ${errMsg(positioningResult.reason)}`)

    setLastResults({ scraper, sentiment, positioning })

    // Spoke 4: report (streaming)
    const failedCount = [scraper, sentiment, positioning].filter(r => r === null).length

    if (failedCount === 3) {
      updateSpoke('report', { status: 'error' })
      addLog('report', 'All 3 research spokes failed — nothing to write a report from.')
      addLog('report', 'Cause: Groq rate limits (free tier). Wait 1 min and retry, or switch to PROD mode for full quality.')
      setRunning(false)
      return
    }

    updateSpoke('report', { status: 'running' })
    if (failedCount > 0) {
      addLog('report', `⚠ ${failedCount}/3 research spokes failed — report will have gaps`)
    }
    setStreaming(true)
    let html = ''
    try {
      for await (const chunk of runReport(competitor, scraper, sentiment, positioning, myProduct)) {
        html += chunk
        setReportHtml(html)
      }
      updateSpoke('report', { status: 'done' })
    } catch (e) {
      updateSpoke('report', { status: 'error' })
      addLog('report', `Error: ${e}`)
    }
    setStreaming(false)
    setRunning(false)
  }

  const handleDeepAnalysis = async () => {
    if (!lastResults || deepLoading) return
    setDeepLoading(true)
    updateSpoke('report', { status: 'running', log: [] })
    setStreaming(true)
    setReportHtml('')

    let html = ''
    try {
      for await (const chunk of runReport(
        competitor,
        lastResults.scraper, lastResults.sentiment, lastResults.positioning,
        myProduct, true,
      )) {
        html += chunk
        setReportHtml(html)
      }
      updateSpoke('report', { status: 'done' })
    } catch (e) {
      updateSpoke('report', { status: 'error' })
      addLog('report', `Error: ${e}`)
    }
    setStreaming(false)
    setDeepLoading(false)
  }

  return (
    <>
      <DevModeToggle />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f0f23; color: #e0e0e0; font-family: system-ui, sans-serif; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        input:focus { border-color: #6c63ff !important; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 2px; }
      `}</style>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid #1e1e3a', padding: '20px 40px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: '#e0e0e0' }}>
            SPYKE
          </div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, textTransform: 'uppercase' }}>
            Competitive Intelligence
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px' }}>

        {/* Your product config */}
        <div style={{ marginBottom: 32 }}>
          <button
            onClick={() => setShowProductConfig(p => !p)}
            style={{
              background: 'none', border: '1px solid #1e1e3a', borderRadius: 6,
              color: '#555', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer',
              padding: '5px 12px', letterSpacing: 1,
            }}
          >
            {showProductConfig ? '▾' : '▸'} YOUR PRODUCT: {myProduct.name}
          </button>

          {showProductConfig && (
            <div style={{
              marginTop: 12, padding: 20, background: '#0d0d20',
              border: '1px solid #1e1e3a', borderRadius: 8, display: 'grid', gap: 12,
            }}>
              {([
                ['name', 'Product name', myProduct.name],
                ['category', 'Category (e.g. B2B SaaS CRM)', myProduct.category],
                ['tagline', 'Tagline', myProduct.tagline],
              ] as [keyof MyProduct, string, string][]).map(([field, label, value]) => (
                <div key={field}>
                  <div style={{ fontSize: 10, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <input
                    value={value as string}
                    onChange={e => {
                      const updated = { ...myProduct, [field]: e.target.value }
                      setMyProduct(updated)
                      saveMyProduct(updated)
                    }}
                    style={{
                      width: '100%', padding: '8px 12px', background: '#0a0a1a',
                      border: '1px solid #2a2a4a', borderRadius: 6, color: '#e0e0e0',
                      fontSize: 13, outline: 'none',
                    }}
                  />
                </div>
              ))}
              <div>
                <div style={{ fontSize: 10, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Positioning (1–2 sentences)</div>
                <textarea
                  value={myProduct.positioning}
                  rows={2}
                  onChange={e => {
                    const updated = { ...myProduct, positioning: e.target.value }
                    setMyProduct(updated)
                    saveMyProduct(updated)
                  }}
                  style={{
                    width: '100%', padding: '8px 12px', background: '#0a0a1a',
                    border: '1px solid #2a2a4a', borderRadius: 6, color: '#e0e0e0',
                    fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Features (one per line)</div>
                <textarea
                  value={myProduct.features.join('\n')}
                  rows={5}
                  onChange={e => {
                    const updated = { ...myProduct, features: e.target.value.split('\n') }
                    setMyProduct(updated)
                    saveMyProduct(updated)
                  }}
                  style={{
                    width: '100%', padding: '8px 12px', background: '#0a0a1a',
                    border: '1px solid #2a2a4a', borderRadius: 6, color: '#e0e0e0',
                    fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'monospace',
                  }}
                />
              </div>
              <button
                onClick={() => { setMyProduct(DEFAULT_MY_PRODUCT); saveMyProduct(DEFAULT_MY_PRODUCT) }}
                style={{
                  alignSelf: 'flex-start', background: 'none', border: '1px solid #2a2a4a',
                  borderRadius: 6, color: '#555', fontSize: 11, cursor: 'pointer', padding: '4px 10px',
                }}
              >
                Reset to FlowDesk demo
              </button>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 12, color: '#6c63ff', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
            SaaS B2B Competitor
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              value={competitor}
              onChange={e => setCompetitor(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              placeholder="HubSpot, Salesforce, Pipedrive..."
              disabled={running}
              style={{
                flex: 1, padding: '14px 18px', background: '#0d0d20',
                border: '1px solid #2a2a4a', borderRadius: 8, color: '#e0e0e0',
                fontSize: 16, outline: 'none', transition: 'border-color 0.2s',
              }}
            />
            <button
              onClick={handleAnalyze}
              disabled={running || !competitor.trim()}
              style={{
                padding: '14px 28px',
                background: running || !competitor.trim() ? '#1e1e3a' : '#6c63ff',
                border: 'none', borderRadius: 8, color: running ? '#888' : '#fff',
                fontSize: 14, fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s', whiteSpace: 'nowrap',
              }}
            >
              {running ? 'Analyzing...' : '▶ Analyze'}
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#444' }}>
            Model: Sonnet 4.6 (spokes 1-3, web search) · Haiku 4.5 (report)
          </div>
        </div>

        {/* Spokes progress */}
        {spokes.scraper.status !== 'idle' && (
          <div style={{ display: 'grid', gap: 12, marginBottom: 32 }}>
            <SpokeLog name="SPOKE 1" label="Web Scraper" status={spokes.scraper.status} log={spokes.scraper.log} model="sonnet-4.6" />
            <SpokeLog name="SPOKE 2" label="Sentiment Analyst" status={spokes.sentiment.status} log={spokes.sentiment.log} model="sonnet-4.6" />
            <SpokeLog name="SPOKE 3" label="Positioning Analyst" status={spokes.positioning.status} log={spokes.positioning.log} model="sonnet-4.6" />
            <SpokeLog name="SPOKE 4" label="Report Writer" status={spokes.report.status} log={spokes.report.log} model="haiku-4.5" />
          </div>
        )}

        {/* Report */}
        {reportHtml && (
          <ReportPanel
            html={reportHtml}
            streaming={streaming}
            onDeepAnalysis={!streaming ? handleDeepAnalysis : undefined}
            deepLoading={deepLoading}
          />
        )}

        {/* Empty state */}
        {spokes.scraper.status === 'idle' && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#2a2a4a' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>◎</div>
            <div style={{ fontFamily: 'monospace', fontSize: 13 }}>
              Enter a competitor name to start the analysis
            </div>
          </div>
        )}
      </main>
    </>
  )
}
