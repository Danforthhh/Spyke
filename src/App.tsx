import { useState, useCallback, useEffect } from 'react'
import SpokeLog from './components/SpokeLog'
import ReportPanel from './components/ReportPanel'
import AuthScreen from './components/AuthScreen'
import AccountModal from './components/AccountModal'
import UnlockModal from './components/UnlockModal'
import DevModeToggle from './components/DevModeToggle'
import ProductPicker from './components/ProductPicker'
import type { SpokesState, ScraperData, SentimentData, PositioningData, MyProduct, Session, SavedReport, SharedProduct } from './types'
import { DEFAULT_MY_PRODUCT } from './types'
import { runScraper } from './services/spokeScraper'
import { runSentiment } from './services/spokeSentiment'
import { runPositioning } from './services/spokePositioning'
import { runReport } from './services/spokeReport'
import { useAuth } from './hooks/useAuth'
import { getUserSettings, saveReport, listReports, deleteReport, listSharedProducts, addSharedProduct, getFavoriteProductId, setFavoriteProductId as saveFavoriteProductId, seedSharedProducts } from './services/firestoreService'
import { decryptApiKey, getPersistedPassword } from './services/cryptoService'

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
  const [competitor,        setCompetitor]        = useState('')
  const [focus,             setFocus]             = useState('')
  const [spokes,            setSpokes]            = useState<SpokesState>(INITIAL_SPOKES)
  const [reportHtml,        setReportHtml]        = useState('')
  const [streaming,         setStreaming]         = useState(false)
  const [deepLoading,       setDeepLoading]       = useState(false)
  const [running,           setRunning]           = useState(false)
  const [myProduct,         setMyProduct]         = useState<MyProduct>(DEFAULT_MY_PRODUCT)
  const [sharedProducts,    setSharedProducts]    = useState<SharedProduct[]>([])
  const [favoriteProductId, setFavoriteProductId] = useState<string | null>(null)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [devMode,           setDevMode]           = useState(() => localStorage.getItem('devMode') === 'true')
  const [lastResults,       setLastResults]       = useState<{
    scraper: ScraperData | null
    sentiment: SentimentData | null
    positioning: PositioningData | null
  } | null>(null)
  const [savedReports,      setSavedReports]      = useState<SavedReport[]>([])
  const [showHistory,       setShowHistory]       = useState(false)
  const [reportDate,        setReportDate]        = useState<number | undefined>(undefined)

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
      setSharedProducts([])
      setFavoriteProductId(null)
      setMyProduct(DEFAULT_MY_PRODUCT)
      return
    }

    setSession({ uid: user.uid, email: user.email ?? '' })

    const pw = getPersistedPassword()
    if (pw) {
      setSessionPassword(pw)
      getUserSettings(user.uid).then(async settings => {
        if (settings?.encryptedKey) {
          const decrypted = await decryptApiKey(settings, pw)
          if (decrypted) setApiKey(decrypted)
        }
      }).catch(err => console.warn('Failed to load user settings:', err))
    } else {
      getUserSettings(user.uid).then(settings => {
        if (settings?.encryptedKey) setShowUnlock(true)
      }).catch(err => console.warn('Failed to load user settings:', err))
    }

    listReports(user.uid).then(setSavedReports).catch(err => console.warn('Failed to load reports:', err))

    Promise.all([
      listSharedProducts(),
      getFavoriteProductId(user.uid),
    ]).then(async ([products, favId]) => {
      if (products.length === 0) {
        await seedSharedProducts(user.uid)
        const seeded = await listSharedProducts()
        setSharedProducts(seeded)
        if (favId) {
          const fav = seeded.find(p => p.id === favId)
          if (fav) setMyProduct(fav)
        }
      } else {
        setSharedProducts(products)
        if (favId) {
          const fav = products.find(p => p.id === favId)
          if (fav) setMyProduct(fav)
        }
      }
      setFavoriteProductId(favId)
    }).catch(err => console.warn('Failed to load shared products:', err))
  }, [user])

  const handleLogin = (password: string) => {
    setSessionPassword(password)
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
    setSharedProducts([])
    setFavoriteProductId(null)
    setMyProduct(DEFAULT_MY_PRODUCT)
  }

  const handleSelectProduct = (product: SharedProduct) => {
    setMyProduct(product)
  }

  const handleSetFavorite = async (productId: string | null) => {
    if (!session) return
    setFavoriteProductId(productId)
    await saveFavoriteProductId(session.uid, productId).catch(() => {})
  }

  const handleAddProduct = async (product: MyProduct) => {
    if (!session) return
    const id = await addSharedProduct(session.uid, product)
    const newProduct: SharedProduct = { ...product, id, createdBy: session.uid, createdAt: Date.now() }
    setSharedProducts(prev => [...prev, newProduct].sort((a, b) => a.name.localeCompare(b.name)))
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
    try {
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
      const scraperP = settle(withTimeout(runScraper(competitor, msg => addLog('scraper', msg), key, focusSnapshot), TIMEOUT, 'Scraper'))
        .then(r => { updateSpoke('scraper', { status: r.status === 'fulfilled' ? 'done' : 'error' }); if (r.status === 'rejected') addLog('scraper', `Error: ${errMsg(r.reason)}`); return r })
      const sentimentP = settle(withTimeout(runSentiment(competitor, msg => addLog('sentiment', msg), key, focusSnapshot), TIMEOUT, 'Sentiment'))
        .then(r => { updateSpoke('sentiment', { status: r.status === 'fulfilled' ? 'done' : 'error' }); if (r.status === 'rejected') addLog('sentiment', `Error: ${errMsg(r.reason)}`); return r })
      const positioningP = settle(withTimeout(runPositioning(competitor, productSnapshot, msg => addLog('positioning', msg), key, focusSnapshot), TIMEOUT, 'Positioning'))
        .then(r => { updateSpoke('positioning', { status: r.status === 'fulfilled' ? 'done' : 'error' }); if (r.status === 'rejected') addLog('positioning', `Error: ${errMsg(r.reason)}`); return r });
      [scraperResult, sentimentResult, positioningResult] = await Promise.all([scraperP, sentimentP, positioningP])
    }

    const scraper     = scraperResult.status     === 'fulfilled' ? scraperResult.value     : null
    const sentiment   = sentimentResult.status   === 'fulfilled' ? sentimentResult.value   : null
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
    } finally {
      setStreaming(false)
    }
    } finally {
      setRunning(false)
    }
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
      <div className="fixed inset-0 bg-slate-50 flex items-center justify-center text-sm text-slate-400 font-mono">
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

  const spokesActive = spokes.scraper.status !== 'idle'
  const analyzing    = running && !reportHtml

  // ── Main app ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
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

      {showProductPicker && (
        <ProductPicker
          products={sharedProducts}
          favoriteId={favoriteProductId}
          onSelect={handleSelectProduct}
          onSetFavorite={handleSetFavorite}
          onAddProduct={handleAddProduct}
          onClose={() => setShowProductPicker(false)}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-black tracking-tighter">S</span>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 tracking-tight leading-none">Spyke</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Competitive Intelligence</div>
          </div>
        </div>
        <button
          onClick={() => setShowAccount(true)}
          className="ml-auto text-xs text-slate-500 font-mono bg-white border border-slate-200 rounded-full px-3 py-1.5 hover:border-slate-300 hover:text-slate-700 transition-colors cursor-pointer"
        >
          {session?.email}
        </button>
      </header>

      {/* 2-column layout */}
      <div className="flex flex-1 min-h-0 gap-0">

        {/* Left column — controls + spokes */}
        <div className="w-[380px] flex-shrink-0 flex flex-col border-r border-slate-200 bg-white overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* Your product */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Your product</div>
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[11px] font-bold text-indigo-500 flex-shrink-0">
                  {myProduct.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{myProduct.name}</div>
                  {myProduct.category && (
                    <div className="text-[11px] text-slate-400 truncate">{myProduct.category}</div>
                  )}
                </div>
                <button
                  onClick={() => setShowProductPicker(true)}
                  className="text-xs font-medium text-indigo-500 hover:text-indigo-700 cursor-pointer bg-transparent border-0 flex-shrink-0 transition-colors"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Competitor input */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Competitor</div>
              <div className="flex gap-2">
                <input
                  value={competitor}
                  onChange={e => setCompetitor(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                  placeholder="HubSpot, Salesforce…"
                  maxLength={200}
                  disabled={running}
                  className="flex-1 px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all disabled:opacity-50"
                />
                <button
                  onClick={handleAnalyze}
                  disabled={running || !competitor.trim()}
                  className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    running || !competitor.trim()
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 cursor-pointer'
                  }`}
                >
                  {running ? '…' : 'Analyze'}
                </button>
              </div>
              <input
                value={focus}
                onChange={e => setFocus(e.target.value)}
                placeholder="Focus area (optional)"
                disabled={running}
                className="mt-2 w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all disabled:opacity-50"
              />
              <p className="mt-1.5 text-[11px] text-slate-400">
                {devMode
                  ? 'Groq Llama 3.3 70B · Tavily search'
                  : 'Claude Sonnet 4.6 (spokes) · Haiku 4.5 (report)'}
              </p>
            </div>

            {/* Past reports */}
            {savedReports.length > 0 && (
              <div>
                <button
                  onClick={() => setShowHistory(h => !h)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors cursor-pointer bg-transparent border-0"
                >
                  <span>{showHistory ? '▾' : '▸'}</span>
                  <span>Past reports ({savedReports.length})</span>
                </button>

                {showHistory && (
                  <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
                    {savedReports.map(r => (
                      <div
                        key={r.id}
                        className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-700 truncate">{r.competitor}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <button
                          onClick={() => { setCompetitor(r.competitor); setReportHtml(r.html); setReportDate(r.createdAt); setShowHistory(false) }}
                          className="text-xs text-indigo-500 hover:text-indigo-700 cursor-pointer bg-transparent border-0 font-medium flex-shrink-0 transition-colors"
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
                          className="text-slate-300 hover:text-red-400 cursor-pointer bg-transparent border-0 text-base leading-none flex-shrink-0 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Spokes */}
          {spokesActive && (
            <div className="px-5 pb-5 space-y-2 border-t border-slate-100 pt-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Research spokes</div>
              <SpokeLog name="SPOKE 1" label="Web Scraper"         status={spokes.scraper.status}    log={spokes.scraper.log}    model={devMode ? 'groq:llama-3.3-70b' : 'sonnet-4.6'} />
              <SpokeLog name="SPOKE 2" label="Sentiment Analyst"   status={spokes.sentiment.status}  log={spokes.sentiment.log}  model={devMode ? 'groq:llama-3.3-70b' : 'sonnet-4.6'} />
              <SpokeLog name="SPOKE 3" label="Positioning Analyst" status={spokes.positioning.status} log={spokes.positioning.log} model={devMode ? 'groq:llama-3.3-70b' : 'sonnet-4.6'} />
              <SpokeLog name="SPOKE 4" label="Report Writer"       status={spokes.report.status}     log={spokes.report.log}     model={devMode ? 'groq:llama-3.3-70b' : 'haiku-4.5'} />
            </div>
          )}

          {/* Empty state */}
          {!spokesActive && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-5 pb-10 text-slate-400">
              <div className="text-3xl mb-3 opacity-30">◎</div>
              <p className="text-sm">Enter a competitor name to start the analysis</p>
            </div>
          )}
        </div>

        {/* Right column — report */}
        <div className="flex-1 flex flex-col min-h-0 p-6">
          {(reportHtml || analyzing) ? (
            <ReportPanel
              html={reportHtml}
              streaming={streaming}
              reportDate={reportDate}
              onDeepAnalysis={!streaming ? handleDeepAnalysis : undefined}
              deepLoading={deepLoading}
              analyzing={analyzing}
              competitorName={competitor}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
              <div className="text-4xl mb-4 opacity-20">◎</div>
              <p className="text-sm font-medium text-slate-500">Report will appear here</p>
              <p className="text-xs mt-1">Run an analysis to generate a competitive report</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
