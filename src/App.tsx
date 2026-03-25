import { useState, useCallback, useEffect } from 'react'
import SpokeLog from './components/SpokeLog'
import ReportPanel from './components/ReportPanel'
import AuthScreen from './components/AuthScreen'
import AccountModal from './components/AccountModal'
import UnlockModal from './components/UnlockModal'
import DevModeToggle from './components/DevModeToggle'
import type { SpokesState, ScraperData, SentimentData, PositioningData, MyProduct, Session, SavedReport } from './types'
import { DEFAULT_MY_PRODUCT } from './types'
import { runScraper } from './services/spokeScraper'
import { runSentiment } from './services/spokeSentiment'
import { runPositioning } from './services/spokePositioning'
import { runReport } from './services/spokeReport'
import { useAuth } from './hooks/useAuth'
import { getUserSettings, saveReport, listReports, deleteReport } from './services/firestoreService'
import { decryptApiKey, getPersistedPassword } from './services/cryptoService'

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
  const { user, loading } = useAuth()

  // ── Session state (in-memory only) ──────────────────────────────────────
  const [session,         setSession]         = useState<Session | null>(null)
  const [sessionPassword, setSessionPassword] = useState<string | null>(null)
  const [apiKey,          setApiKey]          = useState<string | null>(null)
  const [showUnlock,      setShowUnlock]      = useState(false)
  const [showAccount,     setShowAccount]     = useState(false)

  // ── App state ────────────────────────────────────────────────────────────
  const [competitor,       setCompetitor]       = useState('')
  const [focus,            setFocus]            = useState('')
  const [spokes,           setSpokes]           = useState<SpokesState>(INITIAL_SPOKES)
  const [reportHtml,       setReportHtml]       = useState('')
  const [streaming,        setStreaming]        = useState(false)
  const [deepLoading,      setDeepLoading]      = useState(false)
  const [running,          setRunning]          = useState(false)
  const [myProduct,        setMyProduct]        = useState<MyProduct>(loadMyProduct)
  const [showProductConfig, setShowProductConfig] = useState(false)
  const [devMode,          setDevMode]          = useState(() => localStorage.getItem('devMode') === 'true')
  const [lastResults,      setLastResults]      = useState<{
    scraper: ScraperData | null
    sentiment: SentimentData | null
    positioning: PositioningData | null
  } | null>(null)
  const [savedReports,     setSavedReports]     = useState<SavedReport[]>([])
  const [showHistory,      setShowHistory]      = useState(false)
  const [reportDate,       setReportDate]       = useState<number | undefined>(undefined)

  // Stay in sync when DevModeToggle writes to localStorage
  useEffect(() => {
    const onStorage = () => setDevMode(localStorage.getItem('devMode') === 'true')
    window.addEventListener('storage', onStorage)
    const id = setInterval(onStorage, 500)
    return () => { window.removeEventListener('storage', onStorage); clearInterval(id) }
  }, [])

  // When Firebase auth state changes, try to restore the API key from sessionStorage
  useEffect(() => {
    if (!user) {
      setSession(null)
      setSessionPassword(null)
      setApiKey(null)
      setShowUnlock(false)
      return
    }

    setSession({ uid: user.uid, email: user.email ?? '' })

    const pw = getPersistedPassword()
    if (pw) {
      // Attempt auto-decrypt with persisted password
      setSessionPassword(pw)
      getUserSettings(user.uid).then(async settings => {
        if (settings?.encryptedKey) {
          const decrypted = await decryptApiKey(settings, pw)
          if (decrypted) setApiKey(decrypted)
        }
      })
    } else {
      // Check if user has a key; if so, prompt for password
      getUserSettings(user.uid).then(settings => {
        if (settings?.encryptedKey) setShowUnlock(true)
      })
    }

    // Load saved report history
    listReports(user.uid).then(setSavedReports).catch(() => {})
  }, [user])

  const handleLogin = (password: string) => {
    setSessionPassword(password)
    // apiKey will be set by the useEffect above after Firebase auth state updates
  }

  const handleUnlocked = (decryptedKey: string | null, password: string) => {
    setSessionPassword(password)
    setApiKey(decryptedKey)
    setShowUnlock(false)
  }

  const handleLogout = () => {
    setSession(null)
    setSessionPassword(null)
    setApiKey(null)
    setShowUnlock(false)
    setShowAccount(false)
    setSavedReports([])
  }

  // ── Spoke helpers ────────────────────────────────────────────────────────
  const updateSpoke = useCallback((
    spoke: keyof SpokesState,
    patch: Partial<SpokesState[keyof SpokesState]>,
  ) => {
    setSpokes(prev => ({ ...prev, [spoke]: { ...prev[spoke], ...patch } }))
  }, [])

  const addLog = useCallback((spoke: keyof SpokesState, msg: string) => {
    setSpokes(prev => {
      const log = prev[spoke].log
      const trimmed = log.length >= 100 ? log.slice(-99) : log
      return { ...prev, [spoke]: { ...prev[spoke], log: [...trimmed, msg] } }
    })
  }, [])

  const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timeout (${ms / 1000}s)`)), ms)
      ),
    ])

  // ── Analysis ────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!competitor.trim() || running) return
    setRunning(true)
    const productSnapshot: MyProduct = JSON.parse(JSON.stringify(myProduct))
    setSpokes(INITIAL_SPOKES)
    setReportHtml('')
    setReportDate(undefined)
    setLastResults(null)

    const TIMEOUT = 150_000
    const errMsg = (r: unknown) => r instanceof Error ? r.message : String(r)
    const key = apiKey
    const focusSnapshot = focus.trim() || undefined

    const settle = <T,>(p: Promise<T>): Promise<PromiseSettledResult<T>> =>
      p.then((value): PromiseSettledResult<T> => ({ status: 'fulfilled', value }))
       .catch((reason): PromiseSettledResult<T> => ({ status: 'rejected', reason }))

    const isDev = localStorage.getItem('devMode') === 'true'

    let scraperResult: PromiseSettledResult<ScraperData>
    let sentimentResult: PromiseSettledResult<SentimentData>
    let positioningResult: PromiseSettledResult<PositioningData>

    if (isDev) {
      addLog('scraper', '⚡ DEV mode: running spokes sequentially to avoid Groq rate limits')
      updateSpoke('scraper', { status: 'running' })
      scraperResult = await settle(withTimeout(runScraper(competitor, msg => addLog('scraper', msg), key, focusSnapshot), TIMEOUT, 'Scraper'))
      updateSpoke('scraper', { status: scraperResult.status === 'fulfilled' ? 'done' : 'error' })
      if (scraperResult.status === 'rejected') addLog('scraper', `Error: ${errMsg(scraperResult.reason)}`)

      updateSpoke('sentiment', { status: 'running' })
      sentimentResult = await settle(withTimeout(runSentiment(competitor, msg => addLog('sentiment', msg), key, focusSnapshot), TIMEOUT, 'Sentiment'))
      updateSpoke('sentiment', { status: sentimentResult.status === 'fulfilled' ? 'done' : 'error' })
      if (sentimentResult.status === 'rejected') addLog('sentiment', `Error: ${errMsg(sentimentResult.reason)}`)

      updateSpoke('positioning', { status: 'running' })
      positioningResult = await settle(withTimeout(runPositioning(competitor, productSnapshot, msg => addLog('positioning', msg), key, focusSnapshot), TIMEOUT, 'Positioning'))
      updateSpoke('positioning', { status: positioningResult.status === 'fulfilled' ? 'done' : 'error' })
      if (positioningResult.status === 'rejected') addLog('positioning', `Error: ${errMsg(positioningResult.reason)}`)
    } else {
      updateSpoke('scraper', { status: 'running' })
      updateSpoke('sentiment', { status: 'running' })
      updateSpoke('positioning', { status: 'running' })
      // Each spoke updates its own status immediately when it settles (not after all three)
      const scraperP = settle(withTimeout(runScraper(competitor, msg => addLog('scraper', msg), key, focusSnapshot), TIMEOUT, 'Scraper'))
        .then(r => { updateSpoke('scraper', { status: r.status === 'fulfilled' ? 'done' : 'error' }); if (r.status === 'rejected') addLog('scraper', `Error: ${errMsg(r.reason)}`); return r })
      const sentimentP = settle(withTimeout(runSentiment(competitor, msg => addLog('sentiment', msg), key, focusSnapshot), TIMEOUT, 'Sentiment'))
        .then(r => { updateSpoke('sentiment', { status: r.status === 'fulfilled' ? 'done' : 'error' }); if (r.status === 'rejected') addLog('sentiment', `Error: ${errMsg(r.reason)}`); return r })
      const positioningP = settle(withTimeout(runPositioning(competitor, productSnapshot, msg => addLog('positioning', msg), key, focusSnapshot), TIMEOUT, 'Positioning'))
        .then(r => { updateSpoke('positioning', { status: r.status === 'fulfilled' ? 'done' : 'error' }); if (r.status === 'rejected') addLog('positioning', `Error: ${errMsg(r.reason)}`); return r });
      [scraperResult, sentimentResult, positioningResult] = await Promise.all([scraperP, sentimentP, positioningP])
    }

    const scraper    = scraperResult.status    === 'fulfilled' ? scraperResult.value    : null
    const sentiment  = sentimentResult.status  === 'fulfilled' ? sentimentResult.value  : null
    const positioning = positioningResult.status === 'fulfilled' ? positioningResult.value : null

    setLastResults({ scraper, sentiment, positioning })

    const failedCount = [scraper, sentiment, positioning].filter(r => r === null).length

    if (failedCount === 3) {
      updateSpoke('report', { status: 'error' })
      addLog('report', 'All 3 research spokes failed — nothing to write a report from.')
      addLog('report', 'Cause: Groq rate limits (free tier). Wait 1 min and retry, or switch to PROD mode for full quality.')
      setRunning(false)
      return
    }

    updateSpoke('report', { status: 'running' })
    if (failedCount > 0) addLog('report', `⚠ ${failedCount}/3 research spokes failed — report will have gaps`)

    setStreaming(true)
    let html = ''
    try {
      for await (const chunk of runReport(competitor, scraper, sentiment, positioning, productSnapshot, false, key, focusSnapshot)) {
        html += chunk
        setReportHtml(html)
      }
      updateSpoke('report', { status: 'done' })
      // Persist the completed report
      const now = Date.now()
      setReportDate(now)
      if (session) {
        saveReport(session.uid, competitor, html)
          .then(id => setSavedReports(prev => [{ id, competitor, html, createdAt: now }, ...prev]))
          .catch(() => {})
      }
    } catch (e) {
      updateSpoke('report', { status: 'error' })
      addLog('report', `Error: ${e instanceof Error ? e.message : String(e)}`)
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

    const key = apiKey
    let html = ''
    try {
      for await (const chunk of runReport(
        competitor,
        lastResults.scraper, lastResults.sentiment, lastResults.positioning,
        myProduct, true, key,
      )) {
        html += chunk
        setReportHtml(html)
      }
      updateSpoke('report', { status: 'done' })
    } catch (e) {
      updateSpoke('report', { status: 'error' })
      addLog('report', `Error: ${e instanceof Error ? e.message : String(e)}`)
    }
    setStreaming(false)
    setDeepLoading(false)
  }

  // ── Render guards ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#0f0f23',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#888', fontFamily: 'monospace', fontSize: 13,
      }}>
        Loading…
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <DevModeToggle hasApiKey={false} onOpenAccount={() => {}} />
        <AuthScreen onLogin={handleLogin} />
      </>
    )
  }

  if (showUnlock && session) {
    return (
      <>
        <DevModeToggle hasApiKey={false} onOpenAccount={() => {}} />
        <UnlockModal
          uid={session.uid}
          email={session.email}
          onUnlocked={handleUnlocked}
        />
      </>
    )
  }

  // ── Main app ─────────────────────────────────────────────────────────────
  return (
    <>
      <DevModeToggle hasApiKey={!!apiKey} onOpenAccount={() => setShowAccount(true)} />

      {showAccount && session && sessionPassword && (
        <AccountModal
          session={session}
          sessionPassword={sessionPassword}
          hasKey={!!apiKey}
          onKeyUpdated={newKey => setApiKey(newKey)}
          onLogout={handleLogout}
          onClose={() => setShowAccount(false)}
        />
      )}

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
          <div style={{ fontSize: 12, color: '#888', letterSpacing: 2, textTransform: 'uppercase' }}>
            Competitive Intelligence
          </div>
        </div>
        {/* Account button */}
        <button
          onClick={() => setShowAccount(true)}
          style={{
            marginLeft: 'auto', background: 'none', border: '1px solid #2a2a4a',
            borderRadius: 20, color: '#888', fontSize: 12, fontFamily: 'monospace',
            cursor: 'pointer', padding: '5px 14px', letterSpacing: 0.5,
          }}
        >
          {session?.email}
        </button>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px' }}>

        {/* Your product config */}
        <div style={{ marginBottom: 32 }}>
          <button
            onClick={() => setShowProductConfig(p => !p)}
            style={{
              background: 'none', border: '1px solid #1e1e3a', borderRadius: 6,
              color: '#888', fontSize: 13, fontFamily: 'monospace', cursor: 'pointer',
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
                  <div style={{ fontSize: 11, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
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
                      fontSize: 14, outline: 'none',
                    }}
                  />
                </div>
              ))}
              <div>
                <div style={{ fontSize: 11, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Positioning (1–2 sentences)</div>
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
                    fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Features (one per line)</div>
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
                    fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'monospace',
                  }}
                />
              </div>
              <button
                onClick={() => { setMyProduct(DEFAULT_MY_PRODUCT); saveMyProduct(DEFAULT_MY_PRODUCT) }}
                style={{
                  alignSelf: 'flex-start', background: 'none', border: '1px solid #2a2a4a',
                  borderRadius: 6, color: '#888', fontSize: 12, cursor: 'pointer', padding: '4px 10px',
                }}
              >
                Reset to FlowDesk demo
              </button>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 13, color: '#6c63ff', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
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
          <input
            value={focus}
            onChange={e => setFocus(e.target.value)}
            placeholder="Focus area (optional) — e.g. enterprise pricing, API integrations, onboarding..."
            disabled={running}
            style={{
              width: '100%', marginTop: 10, padding: '10px 18px', background: '#0d0d20',
              border: '1px solid #1e1e3a', borderRadius: 8, color: '#aaa',
              fontSize: 13, outline: 'none', transition: 'border-color 0.2s',
            }}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: '#777' }}>
            {devMode
              ? 'Model: Groq Llama 3.3 70B · sequential · Tavily search'
              : 'Model: Sonnet 4.6 (spokes 1-3, web search) · Haiku 4.5 (report)'}
          </div>
        </div>

        {/* Past reports */}
        {savedReports.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <button
              onClick={() => setShowHistory(h => !h)}
              style={{
                background: 'none', border: '1px solid #1e1e3a', borderRadius: 6,
                color: '#888', fontSize: 13, fontFamily: 'monospace', cursor: 'pointer',
                padding: '5px 12px', letterSpacing: 1,
              }}
            >
              {showHistory ? '▾' : '▸'} PAST REPORTS ({savedReports.length})
            </button>

            {showHistory && (
              <div style={{
                marginTop: 12, padding: '8px 0', background: '#0d0d20',
                border: '1px solid #1e1e3a', borderRadius: 8,
              }}>
                {savedReports.map(r => (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '8px 16px', borderBottom: '1px solid #1a1a30',
                    }}
                  >
                    <span style={{ flex: 1, fontSize: 14, color: '#e0e0e0' }}>{r.competitor}</span>
                    <span style={{ fontSize: 12, color: '#555', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => { setCompetitor(r.competitor); setReportHtml(r.html); setReportDate(r.createdAt); setShowHistory(false) }}
                      style={{
                        padding: '4px 12px', background: 'none', border: '1px solid #2a2a4a',
                        borderRadius: 6, color: '#aaa', fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => {
                        if (!session) return
                        deleteReport(session.uid, r.id)
                          .then(() => setSavedReports(prev => prev.filter(x => x.id !== r.id)))
                          .catch(() => {})
                      }}
                      style={{
                        padding: '4px 8px', background: 'none', border: '1px solid #3a1a1a',
                        borderRadius: 6, color: '#7a3a3a', fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Spokes progress */}
        {spokes.scraper.status !== 'idle' && (
          <div style={{ display: 'grid', gap: 12, marginBottom: 32 }}>
            <SpokeLog name="SPOKE 1" label="Web Scraper" status={spokes.scraper.status} log={spokes.scraper.log} model={devMode ? 'groq:llama-3.3-70b' : 'sonnet-4.6'} />
            <SpokeLog name="SPOKE 2" label="Sentiment Analyst" status={spokes.sentiment.status} log={spokes.sentiment.log} model={devMode ? 'groq:llama-3.3-70b' : 'sonnet-4.6'} />
            <SpokeLog name="SPOKE 3" label="Positioning Analyst" status={spokes.positioning.status} log={spokes.positioning.log} model={devMode ? 'groq:llama-3.3-70b' : 'sonnet-4.6'} />
            <SpokeLog name="SPOKE 4" label="Report Writer" status={spokes.report.status} log={spokes.report.log} model={devMode ? 'groq:llama-3.3-70b' : 'haiku-4.5'} />
          </div>
        )}

        {/* Report */}
        {reportHtml && (
          <ReportPanel
            html={reportHtml}
            streaming={streaming}
            reportDate={reportDate}
            onDeepAnalysis={!streaming ? handleDeepAnalysis : undefined}
            deepLoading={deepLoading}
          />
        )}

        {/* Empty state */}
        {spokes.scraper.status === 'idle' && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#4a4a6a' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>◎</div>
            <div style={{ fontFamily: 'monospace', fontSize: 14 }}>
              Enter a competitor name to start the analysis
            </div>
          </div>
        )}
      </main>
    </>
  )
}
