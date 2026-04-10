import { useState, useCallback, useEffect } from 'react'
import SpokeLog from './components/SpokeLog'
import ReportPanel from './components/ReportPanel'
import AuthScreen from './components/AuthScreen'
import DemoView from './components/DemoView'
import AccountModal from './components/AccountModal'
import UnlockModal from './components/UnlockModal'
import DevModeToggle from './components/DevModeToggle'
import ProductPicker from './components/ProductPicker'
import type { SpokesState, SpokeState, ScraperData, SentimentData, PositioningData, MyProduct, Session, SavedReport, SharedProduct, CompetitorAnalysis } from './types'
import { DEFAULT_MY_PRODUCT } from './types'
import { runScraper } from './services/spokeScraper'
import { runSentiment } from './services/spokeSentiment'
import { runPositioning } from './services/spokePositioning'
import { runReport } from './services/spokeReport'
import { runComparisonReport } from './services/spokeComparisonReport'
import { useAuth } from './hooks/useAuth'
import { getUserSettings, saveReport, listReports, deleteReport, saveEncryptedKey, listSharedProducts, addSharedProduct, getFavoriteProductId, setFavoriteProductId as saveFavoriteProductId, seedSharedProducts } from './services/firestoreService'
import { decryptApiKey, getPersistedPassword, encryptApiKey } from './services/cryptoService'

const INITIAL_SPOKES: SpokesState = {
  scraper:    { status: 'idle', log: [] },
  sentiment:  { status: 'idle', log: [] },
  positioning:{ status: 'idle', log: [] },
  report:     { status: 'idle', log: [] },
}

const QUICK_PICKS = ['HubSpot', 'Salesforce', 'Pipedrive', 'Apollo.io', 'Close CRM']

// ── Theme helpers ───────────────────────────────────────────────────────────
function getStoredTheme(): 'dark' | 'light' {
  return (localStorage.getItem('theme') as 'dark' | 'light') ?? 'light'
}
function applyTheme(t: 'dark' | 'light') {
  document.documentElement.classList.toggle('dark', t === 'dark')
  localStorage.setItem('theme', t)
}

export default function App() {
  const { user, loading } = useAuth()

  // ── Theme ────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const t = getStoredTheme()
    applyTheme(t)
    return t
  })
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
  }

  // ── Session state ────────────────────────────────────────────────────────
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
  const [showDemo,          setShowDemo]          = useState(false)

  // ── Compare mode ─────────────────────────────────────────────────────────
  const [analysisMode,       setAnalysisMode]       = useState<'single' | 'compare'>('single')
  const [compareNames,       setCompareNames]       = useState<string[]>(['', ''])
  const [compareSpokes,      setCompareSpokes]      = useState<
    Record<string, { scraper: SpokeState; sentiment: SpokeState; positioning: SpokeState }>
  >({})
  const [compareReportSpoke, setCompareReportSpoke] = useState<SpokeState>({ status: 'idle', log: [] })
  const [lastResults,       setLastResults]       = useState<{
    scraper: ScraperData | null
    sentiment: SentimentData | null
    positioning: PositioningData | null
  } | null>(null)
  const [savedReports,  setSavedReports]  = useState<SavedReport[]>([])
  const [showHistory,   setShowHistory]   = useState(false)
  const [reportDate,    setReportDate]    = useState<number | undefined>(undefined)

  const handleToggleMode = useCallback((next: boolean) => {
    localStorage.setItem('devMode', String(next))
    setDevMode(next)
  }, [])

  const handleSaveKeyInline = useCallback(async (key: string) => {
    if (!session || !sessionPassword) throw new Error('Not authenticated')
    const bundle = await encryptApiKey(key, sessionPassword)
    await saveEncryptedKey(session.uid, bundle)
    setApiKey(key)
  }, [session, sessionPassword])

  // Auth state changes
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

      // Fix 3B — auto DEV mode for users with no API key and no explicit preference
      if (!pw && localStorage.getItem('devMode') === null) {
        localStorage.setItem('devMode', 'true')
        setDevMode(true)
      }
    }).catch(err => console.warn('Failed to load shared products:', err))
  }, [user])

  const handleLogin       = (password: string)                       => setSessionPassword(password)
  const handleUnlocked    = (decryptedKey: string | null, pw: string) => { setSessionPassword(pw); setApiKey(decryptedKey); setShowUnlock(false) }

  const handleLogout = () => {
    setSession(null); setSessionPassword(null); setApiKey(null)
    setShowUnlock(false); setShowAccount(false)
    setSavedReports([]); setSharedProducts([])
    setFavoriteProductId(null); setMyProduct(DEFAULT_MY_PRODUCT)
  }

  const handleSelectProduct = (product: SharedProduct) => setMyProduct(product)

  const handleSetFavorite = async (productId: string | null) => {
    if (!session) return
    setFavoriteProductId(productId)
    await saveFavoriteProductId(session.uid, productId).catch(err => console.error('Failed to save favorite:', err))
  }

  const handleAddProduct = async (product: MyProduct) => {
    if (!session) return
    const id = await addSharedProduct(session.uid, product)
    const newProduct: SharedProduct = { ...product, id, createdBy: session.uid, createdAt: Date.now() }
    setSharedProducts(prev => [...prev, newProduct].sort((a, b) => a.name.localeCompare(b.name)))
  }

  // ── Spoke helpers ────────────────────────────────────────────────────────
  const updateSpoke = useCallback((spoke: keyof SpokesState, patch: Partial<SpokesState[keyof SpokesState]>) => {
    setSpokes(prev => ({ ...prev, [spoke]: { ...prev[spoke], ...patch } }))
  }, [])

  const addLog = useCallback((spoke: keyof SpokesState, msg: string) => {
    setSpokes(prev => {
      const log     = prev[spoke].log
      const trimmed = log.length >= 100 ? log.slice(-99) : log
      return { ...prev, [spoke]: { ...prev[spoke], log: [...trimmed, msg] } }
    })
  }, [])

  const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout (${ms / 1000}s)`)), ms)),
    ])

  // Computed spoke status string for ReportPanel spinner (Fix 3C)
  const spokeStatus: string | undefined = (() => {
    if (!running || reportHtml) return undefined
    const names    = ['Scraper', 'Sentiment', 'Positioning'] as const
    const statuses = [spokes.scraper.status, spokes.sentiment.status, spokes.positioning.status]
    const doneCount    = statuses.filter(s => s === 'done').length
    const runningNames = names.filter((_, i) => statuses[i] === 'running')
    if (doneCount === 3)          return 'All research done — writing report…'
    if (runningNames.length > 0)  return `${runningNames.join(' + ')} running… (${doneCount}/3 done)`
    return 'Preparing research spokes…'
  })()

  // ── Analysis ─────────────────────────────────────────────────────────────
  const handleAnalyze = async (overrideCompetitor?: string) => {
    const name = (overrideCompetitor ?? competitor).trim()
    if (!name || running) return
    if (overrideCompetitor) setCompetitor(overrideCompetitor)

    setRunning(true)
    try {
      const productSnapshot: MyProduct = JSON.parse(JSON.stringify(myProduct))
      setSpokes(INITIAL_SPOKES)
      setReportHtml('')
      setReportDate(undefined)
      setLastResults(null)

      const TIMEOUT = 150_000
      const errMsg  = (r: unknown) => r instanceof Error ? r.message : String(r)
      const key     = apiKey
      const focusSnapshot = focus.trim() || undefined

      const settle = <T,>(p: Promise<T>): Promise<PromiseSettledResult<T>> =>
        p.then((value): PromiseSettledResult<T> => ({ status: 'fulfilled', value }))
         .catch((reason): PromiseSettledResult<T> => ({ status: 'rejected', reason }))

      const isDev = localStorage.getItem('devMode') === 'true'

      let scraperResult:    PromiseSettledResult<ScraperData>
      let sentimentResult:  PromiseSettledResult<SentimentData>
      let positioningResult:PromiseSettledResult<PositioningData>

      if (isDev) {
        addLog('scraper', '⚡ DEV mode: running spokes sequentially to avoid Groq rate limits')
        updateSpoke('scraper', { status: 'running' })
        scraperResult = await settle(withTimeout(runScraper(name, msg => addLog('scraper', msg), key, focusSnapshot), TIMEOUT, 'Scraper'))
        updateSpoke('scraper', { status: scraperResult.status === 'fulfilled' ? 'done' : 'error' })
        if (scraperResult.status === 'rejected') addLog('scraper', `Error: ${errMsg(scraperResult.reason)}`)

        updateSpoke('sentiment', { status: 'running' })
        sentimentResult = await settle(withTimeout(runSentiment(name, msg => addLog('sentiment', msg), key, focusSnapshot), TIMEOUT, 'Sentiment'))
        updateSpoke('sentiment', { status: sentimentResult.status === 'fulfilled' ? 'done' : 'error' })
        if (sentimentResult.status === 'rejected') addLog('sentiment', `Error: ${errMsg(sentimentResult.reason)}`)

        updateSpoke('positioning', { status: 'running' })
        positioningResult = await settle(withTimeout(runPositioning(name, productSnapshot, msg => addLog('positioning', msg), key, focusSnapshot), TIMEOUT, 'Positioning'))
        updateSpoke('positioning', { status: positioningResult.status === 'fulfilled' ? 'done' : 'error' })
        if (positioningResult.status === 'rejected') addLog('positioning', `Error: ${errMsg(positioningResult.reason)}`)
      } else {
        updateSpoke('scraper',    { status: 'running' })
        updateSpoke('sentiment',  { status: 'running' })
        updateSpoke('positioning',{ status: 'running' })
        const scraperP    = settle(withTimeout(runScraper(name, msg => addLog('scraper', msg), key, focusSnapshot), TIMEOUT, 'Scraper'))
          .then(r => { updateSpoke('scraper',    { status: r.status === 'fulfilled' ? 'done' : 'error' }); if (r.status === 'rejected') addLog('scraper',    `Error: ${errMsg(r.reason)}`); return r })
        const sentimentP  = settle(withTimeout(runSentiment(name, msg => addLog('sentiment', msg), key, focusSnapshot), TIMEOUT, 'Sentiment'))
          .then(r => { updateSpoke('sentiment',  { status: r.status === 'fulfilled' ? 'done' : 'error' }); if (r.status === 'rejected') addLog('sentiment',  `Error: ${errMsg(r.reason)}`); return r })
        const positioningP= settle(withTimeout(runPositioning(name, productSnapshot, msg => addLog('positioning', msg), key, focusSnapshot), TIMEOUT, 'Positioning'))
          .then(r => { updateSpoke('positioning',{ status: r.status === 'fulfilled' ? 'done' : 'error' }); if (r.status === 'rejected') addLog('positioning',`Error: ${errMsg(r.reason)}`); return r });
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
        addLog('report', 'Cause: Groq rate limits (free tier). Wait 1 min and retry, or switch to PROD mode.')
        return
      }

      updateSpoke('report', { status: 'running' })
      if (failedCount > 0) addLog('report', `⚠ ${failedCount}/3 research spokes failed — report will have gaps`)

      setStreaming(true)
      let html = ''
      try {
        for await (const chunk of runReport(name, scraper, sentiment, positioning, productSnapshot, false, key, focusSnapshot)) {
          html += chunk
          setReportHtml(html)
        }
        updateSpoke('report', { status: 'done' })
        const now = Date.now()
        setReportDate(now)
        if (session) {
          saveReport(session.uid, name, html)
            .then(id => setSavedReports(prev => [{ id, competitor: name, html, createdAt: now }, ...prev]))
            .catch(err => console.error('Failed to save report:', err))
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
    const key  = apiKey
    let   html = ''
    try {
      for await (const chunk of runReport(competitor, lastResults.scraper, lastResults.sentiment, lastResults.positioning, myProduct, true, key)) {
        html += chunk
        setReportHtml(html)
      }
      updateSpoke('report', { status: 'done' })
    } catch (e) {
      updateSpoke('report', { status: 'error' })
      addLog('report', `Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setStreaming(false)
      setDeepLoading(false)
    }
  }

  const handleCompare = async () => {
    const names = compareNames.map(n => n.trim()).filter(Boolean)
    if (names.length < 2 || running) return

    setRunning(true)
    setReportHtml('')
    setReportDate(undefined)
    setLastResults(null)
    setCompareReportSpoke({ status: 'idle', log: [] })

    const initSpokes = () => Object.fromEntries(
      names.map(n => [n, {
        scraper:     { status: 'idle' as const, log: [] },
        sentiment:   { status: 'idle' as const, log: [] },
        positioning: { status: 'idle' as const, log: [] },
      }])
    )
    setCompareSpokes(initSpokes())

    const TIMEOUT = 150_000
    const key     = apiKey
    const focusSnapshot = focus.trim() || undefined
    const isDev   = localStorage.getItem('devMode') === 'true'

    const updateCS = (name: string, spoke: 'scraper' | 'sentiment' | 'positioning', patch: Partial<SpokeState>) =>
      setCompareSpokes(prev => ({
        ...prev,
        [name]: { ...prev[name], [spoke]: { ...prev[name]?.[spoke], ...patch } }
      }))

    const addCSLog = (name: string, spoke: 'scraper' | 'sentiment' | 'positioning', msg: string) =>
      setCompareSpokes(prev => {
        const log = prev[name]?.[spoke]?.log ?? []
        return { ...prev, [name]: { ...prev[name], [spoke]: { ...prev[name]?.[spoke], log: [...log, msg] } } }
      })

    const addCRLog = (msg: string) =>
      setCompareReportSpoke(prev => ({ ...prev, log: [...prev.log, msg] }))

    const settle = <T,>(p: Promise<T>): Promise<PromiseSettledResult<T>> =>
      p.then((v): PromiseSettledResult<T> => ({ status: 'fulfilled', value: v }))
       .catch((r): PromiseSettledResult<T> => ({ status: 'rejected', reason: r }))

    const errMsg = (r: unknown) => r instanceof Error ? r.message : String(r)

    const productSnapshot: MyProduct = JSON.parse(JSON.stringify(myProduct))
    const results: CompetitorAnalysis[] = []

    try {
      if (isDev) {
        addCRLog('⚡ DEV mode: running comparison sequentially to avoid Groq rate limits')
        for (const name of names) {
          updateCS(name, 'scraper', { status: 'running' })
          const sr = await settle(withTimeout(runScraper(name, msg => addCSLog(name, 'scraper', msg), key, focusSnapshot), TIMEOUT, 'Scraper'))
          updateCS(name, 'scraper', { status: sr.status === 'fulfilled' ? 'done' : 'error' })
          if (sr.status === 'rejected') addCSLog(name, 'scraper', `Error: ${errMsg(sr.reason)}`)

          updateCS(name, 'sentiment', { status: 'running' })
          const se = await settle(withTimeout(runSentiment(name, msg => addCSLog(name, 'sentiment', msg), key, focusSnapshot), TIMEOUT, 'Sentiment'))
          updateCS(name, 'sentiment', { status: se.status === 'fulfilled' ? 'done' : 'error' })
          if (se.status === 'rejected') addCSLog(name, 'sentiment', `Error: ${errMsg(se.reason)}`)

          updateCS(name, 'positioning', { status: 'running' })
          const po = await settle(withTimeout(runPositioning(name, productSnapshot, msg => addCSLog(name, 'positioning', msg), key, focusSnapshot), TIMEOUT, 'Positioning'))
          updateCS(name, 'positioning', { status: po.status === 'fulfilled' ? 'done' : 'error' })
          if (po.status === 'rejected') addCSLog(name, 'positioning', `Error: ${errMsg(po.reason)}`)

          results.push({
            name,
            scraper:     sr.status === 'fulfilled' ? sr.value : null,
            sentiment:   se.status === 'fulfilled' ? se.value : null,
            positioning: po.status === 'fulfilled' ? po.value : null,
          })
        }
      } else {
        // PROD: all N×3 spokes in parallel
        names.forEach(name => {
          updateCS(name, 'scraper',     { status: 'running' })
          updateCS(name, 'sentiment',   { status: 'running' })
          updateCS(name, 'positioning', { status: 'running' })
        })
        await Promise.all(names.map(async name => {
          const [sr, se, po] = await Promise.all([
            settle(withTimeout(runScraper(name, msg => addCSLog(name, 'scraper', msg), key, focusSnapshot), TIMEOUT, 'Scraper'))
              .then(r => { updateCS(name, 'scraper', { status: r.status === 'fulfilled' ? 'done' : 'error' }); if (r.status === 'rejected') addCSLog(name, 'scraper', `Error: ${errMsg(r.reason)}`); return r }),
            settle(withTimeout(runSentiment(name, msg => addCSLog(name, 'sentiment', msg), key, focusSnapshot), TIMEOUT, 'Sentiment'))
              .then(r => { updateCS(name, 'sentiment', { status: r.status === 'fulfilled' ? 'done' : 'error' }); if (r.status === 'rejected') addCSLog(name, 'sentiment', `Error: ${errMsg(r.reason)}`); return r }),
            settle(withTimeout(runPositioning(name, productSnapshot, msg => addCSLog(name, 'positioning', msg), key, focusSnapshot), TIMEOUT, 'Positioning'))
              .then(r => { updateCS(name, 'positioning', { status: r.status === 'fulfilled' ? 'done' : 'error' }); if (r.status === 'rejected') addCSLog(name, 'positioning', `Error: ${errMsg(r.reason)}`); return r }),
          ])
          results.push({
            name,
            scraper:     sr.status === 'fulfilled' ? sr.value : null,
            sentiment:   se.status === 'fulfilled' ? se.value : null,
            positioning: po.status === 'fulfilled' ? po.value : null,
          })
        }))
      }

      setCompareReportSpoke(prev => ({ ...prev, status: 'running' }))
      setStreaming(true)
      let html = ''
      try {
        for await (const chunk of runComparisonReport(results, productSnapshot, key, focusSnapshot)) {
          html += chunk
          setReportHtml(html)
        }
        setCompareReportSpoke(prev => ({ ...prev, status: 'done' }))
        const now = Date.now()
        setReportDate(now)
        const label = names.join(' vs ')
        if (session) {
          saveReport(session.uid, label, html)
            .then(id => setSavedReports(prev => [{ id, competitor: label, html, createdAt: now }, ...prev]))
            .catch(err => console.error('Failed to save comparison report:', err))
        }
      } catch (e) {
        setCompareReportSpoke(prev => ({ ...prev, status: 'error' }))
        addCRLog(`Error: ${e instanceof Error ? e.message : String(e)}`)
      } finally {
        setStreaming(false)
      }
    } finally {
      setRunning(false)
    }
  }

  // ── Render guards ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-sm text-slate-400 font-mono">
        Loading…
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <button onClick={toggleTheme} className="fixed top-3 right-3 z-50 w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shadow-sm cursor-pointer text-base">
          {theme === 'dark' ? '☀' : '☽'}
        </button>
        {showDemo
          ? <DemoView onSignUp={() => setShowDemo(false)} />
          : <AuthScreen onLogin={handleLogin} onViewDemo={() => setShowDemo(true)} />
        }
      </>
    )
  }

  if (showUnlock && session) {
    return (
      <>
        <button onClick={toggleTheme} className="fixed top-3 right-3 z-50 w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shadow-sm cursor-pointer text-base">
          {theme === 'dark' ? '☀' : '☽'}
        </button>
        <UnlockModal uid={session.uid} email={session.email} onUnlocked={handleUnlocked} />
      </>
    )
  }

  const spokesActive = spokes.scraper.status !== 'idle'
  const analyzing    = running && !reportHtml
  const compareLabel = compareNames.filter(n => n.trim()).join(' vs ')

  // ── Main app ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
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
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-3.5 flex items-center gap-4 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 32 32" className="w-8 h-8 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="10" fill="none" stroke="#6c63ff" strokeWidth="1.5"/>
            <line x1="16" y1="3"    x2="16" y2="9.5"  stroke="#6c63ff" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="16" y1="22.5" x2="16" y2="29"   stroke="#6c63ff" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="3"  y1="16"   x2="9.5" y2="16"  stroke="#6c63ff" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="22.5" y1="16" x2="29" y2="16"   stroke="#6c63ff" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="16" cy="16" r="2.5" fill="#6c63ff"/>
          </svg>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">Spyke</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Competitive Intelligence</div>
          </div>
        </div>

        {/* DEV/PROD pill — inline, no overlap */}
        <DevModeToggle
          devMode={devMode}
          hasApiKey={!!apiKey}
          onToggle={handleToggleMode}
          onSaveKey={handleSaveKeyInline}
        />

        <div className="ml-auto flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-base"
          >
            {theme === 'dark' ? '☀' : '☽'}
          </button>

          {/* Account */}
          <button
            onClick={() => setShowAccount(true)}
            className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            {session?.email}
          </button>
        </div>
      </header>

      {/* 2-column layout */}
      <div className="flex flex-1 min-h-0">

        {/* Left sidebar */}
        <div className="w-[440px] flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-y-auto">
          <div className="p-6 space-y-6">

            {/* Your product */}
            <div>
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Your product</div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-xs font-bold text-indigo-500 dark:text-indigo-400 flex-shrink-0">
                  {myProduct.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium text-slate-800 dark:text-slate-200 truncate">{myProduct.name}</div>
                  {myProduct.category && (
                    <div className="text-xs text-slate-400 dark:text-slate-500 truncate">{myProduct.category}</div>
                  )}
                </div>
                <button
                  onClick={() => setShowProductPicker(true)}
                  className="text-sm font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer bg-transparent border-0 flex-shrink-0 transition-colors"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Analysis mode tabs + inputs */}
            <div>
              {/* Mode tabs */}
              <div className="flex gap-4 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                {(['single', 'compare'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => { setAnalysisMode(m); setSpokes(INITIAL_SPOKES); setCompareSpokes({}); setCompareReportSpoke({ status: 'idle', log: [] }) }}
                    disabled={running}
                    className={`text-sm font-semibold pb-1 transition-colors cursor-pointer bg-transparent border-0 disabled:cursor-not-allowed ${
                      analysisMode === m
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                    style={{ borderBottom: analysisMode === m ? '2px solid #6366f1' : '2px solid transparent' }}
                  >
                    {m === 'single' ? 'Analyze' : 'Compare'}
                  </button>
                ))}
              </div>

              {analysisMode === 'single' ? (
                <>
                  <div className="flex gap-2">
                    <input
                      value={competitor}
                      onChange={e => setCompetitor(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                      placeholder="HubSpot, Salesforce…"
                      maxLength={200}
                      disabled={running}
                      className="flex-1 px-3.5 py-2.5 text-base bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all disabled:opacity-50"
                    />
                    <button
                      onClick={() => handleAnalyze()}
                      disabled={running || !competitor.trim()}
                      className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                        running || !competitor.trim()
                          ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/40 cursor-pointer'
                      }`}
                    >
                      {running ? '…' : 'Analyze'}
                    </button>
                  </div>

                  {!running && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {QUICK_PICKS.map(name => (
                        <button
                          key={name}
                          onClick={() => handleAnalyze(name)}
                          className="px-2.5 py-1 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer bg-white dark:bg-slate-800"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Compare mode inputs */
                <div className="space-y-2">
                  {compareNames.map((name, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        value={name}
                        onChange={e => setCompareNames(prev => prev.map((n, j) => j === i ? e.target.value : n))}
                        placeholder={`Competitor ${i + 1}…`}
                        maxLength={200}
                        disabled={running}
                        className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all disabled:opacity-50"
                      />
                      {compareNames.length > 2 && (
                        <button
                          onClick={() => setCompareNames(prev => prev.filter((_, j) => j !== i))}
                          disabled={running}
                          className="text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-500 text-lg leading-none bg-transparent border-0 cursor-pointer transition-colors disabled:cursor-not-allowed flex-shrink-0"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {compareNames.length < 4 && (
                    <button
                      onClick={() => setCompareNames(prev => [...prev, ''])}
                      disabled={running}
                      className="text-xs text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors cursor-pointer bg-transparent border-0 disabled:cursor-not-allowed"
                    >
                      + Add competitor
                    </button>
                  )}
                </div>
              )}

              <input
                value={focus}
                onChange={e => setFocus(e.target.value)}
                placeholder="Focus area (optional)"
                disabled={running}
                className="mt-3 w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all disabled:opacity-50"
              />

              {analysisMode === 'compare' && (
                <button
                  onClick={handleCompare}
                  disabled={running || compareNames.filter(n => n.trim()).length < 2}
                  className={`mt-3 w-full py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                    running || compareNames.filter(n => n.trim()).length < 2
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/40 cursor-pointer'
                  }`}
                >
                  {running ? '…' : 'Compare'}
                </button>
              )}

              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
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
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer bg-transparent border-0"
                >
                  <span>{showHistory ? '▾' : '▸'}</span>
                  <span>Past reports ({savedReports.length})</span>
                </button>

                {showHistory && (
                  <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    {savedReports.map(r => (
                      <div
                        key={r.id}
                        className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{r.competitor}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <button
                          onClick={() => { setCompetitor(r.competitor); setReportHtml(r.html); setReportDate(r.createdAt); setShowHistory(false) }}
                          className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer bg-transparent border-0 font-medium flex-shrink-0 transition-colors"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => {
                            if (!session) return
                            deleteReport(session.uid, r.id)
                              .then(() => setSavedReports(prev => prev.filter(x => x.id !== r.id)))
                              .catch(err => console.error('Failed to delete report:', err))
                          }}
                          className="text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-500 cursor-pointer bg-transparent border-0 text-base leading-none flex-shrink-0 transition-colors"
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

          {/* Research spokes — single mode */}
          {spokesActive && analysisMode === 'single' && (
            <div className="px-6 pb-6 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-5">
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Research spokes</div>
              <SpokeLog name="SPOKE 1" label="Web Scraper"         status={spokes.scraper.status}     log={spokes.scraper.log}     model={devMode ? 'groq:llama-3.3-70b' : 'sonnet-4.6'} />
              <SpokeLog name="SPOKE 2" label="Sentiment Analyst"   status={spokes.sentiment.status}   log={spokes.sentiment.log}   model={devMode ? 'groq:llama-3.3-70b' : 'sonnet-4.6'} />
              <SpokeLog name="SPOKE 3" label="Positioning Analyst" status={spokes.positioning.status} log={spokes.positioning.log} model={devMode ? 'groq:llama-3.3-70b' : 'sonnet-4.6'} />
              <SpokeLog name="SPOKE 4" label="Report Writer"       status={spokes.report.status}      log={spokes.report.log}      model={devMode ? 'groq:llama-3.3-70b' : 'haiku-4.5'} />
            </div>
          )}

          {/* Research spokes — compare mode */}
          {analysisMode === 'compare' && Object.keys(compareSpokes).length > 0 && (
            <div className="px-6 pb-6 border-t border-slate-100 dark:border-slate-800 pt-5">
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Research spokes</div>
              {/* Header row */}
              <div className="grid gap-x-3 mb-1 px-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest" style={{ gridTemplateColumns: '1fr 52px 52px 52px' }}>
                <span></span><span className="text-center">Scrape</span><span className="text-center">Sent.</span><span className="text-center">Pos.</span>
              </div>
              {Object.entries(compareSpokes).map(([name, s]) => (
                <div key={name} className="grid gap-x-3 items-center py-1 px-1" style={{ gridTemplateColumns: '1fr 52px 52px 52px' }}>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{name}</span>
                  {(['scraper', 'sentiment', 'positioning'] as const).map(spoke => {
                    const st = s[spoke].status
                    return (
                      <span key={spoke} className={`text-center text-sm ${
                        st === 'idle'    ? 'text-slate-300 dark:text-slate-600' :
                        st === 'running' ? 'text-indigo-400 animate-pulse' :
                        st === 'done'    ? 'text-emerald-500' : 'text-red-400'
                      }`}>
                        {st === 'idle' ? '–' : st === 'running' ? '●' : st === 'done' ? '✓' : '✗'}
                      </span>
                    )
                  })}
                </div>
              ))}
              <div className="mt-3">
                <SpokeLog name="COMPARE" label="Comparison Report" status={compareReportSpoke.status} log={compareReportSpoke.log} model={devMode ? 'groq:llama-3.3-70b' : 'haiku-4.5'} />
              </div>
            </div>
          )}

          {/* Empty state */}
          {!spokesActive && !(analysisMode === 'compare' && Object.keys(compareSpokes).length > 0) && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-12 text-slate-400 dark:text-slate-600">
              <div className="text-3xl mb-3 opacity-30">◎</div>
              <p className="text-base text-slate-500 dark:text-slate-500">
                {analysisMode === 'single'
                  ? 'Pick a competitor above or click a quick-pick chip to start'
                  : 'Enter at least 2 competitors and click Compare'}
              </p>
            </div>
          )}
        </div>

        {/* Right panel — report */}
        <div className="flex-1 flex flex-col min-h-0 p-6 bg-slate-50 dark:bg-slate-950">
          {(reportHtml || analyzing) ? (
            <ReportPanel
              html={reportHtml}
              streaming={streaming}
              reportDate={reportDate}
              onDeepAnalysis={!streaming && analysisMode === 'single' ? handleDeepAnalysis : undefined}
              deepLoading={deepLoading}
              analyzing={analyzing}
              competitorName={analysisMode === 'compare' ? compareLabel : competitor}
              spokeStatus={spokeStatus}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-600">
              <div className="text-5xl mb-4 opacity-20">◎</div>
              <p className="text-base font-medium text-slate-500 dark:text-slate-500">Report will appear here</p>
              <p className="text-sm mt-1 text-slate-400 dark:text-slate-600">Run an analysis to generate a competitive report</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
