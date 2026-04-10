import { useState, useEffect, useCallback } from 'react'

const PROXY_URL = 'https://dev-proxy.vin-bories.workers.dev'
const POLL_MS   = 5000

interface ProxyStats {
  tavilySearches: number
  ddgSearches:   number
  limit:         number
  remaining:     number
  resetDate:     string
}

interface Props {
  hasApiKey: boolean
  onOpenAccount: () => void
}

async function fetchStats(): Promise<ProxyStats | null> {
  try {
    const res = await fetch(`${PROXY_URL}/stats`, { signal: AbortSignal.timeout(2000) })
    if (!res.ok) return null
    return await res.json() as ProxyStats
  } catch {
    return null
  }
}

function formatResetDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function DevModeToggle({ hasApiKey, onOpenAccount }: Props) {
  const [devMode,   setDevMode]   = useState(() => localStorage.getItem('devMode') === 'true')
  const [stats,     setStats]     = useState<ProxyStats | null>(null)
  const [offline,   setOffline]   = useState(false)
  const [showNoKey, setShowNoKey] = useState(false)

  const refreshStats = useCallback(async () => {
    if (!devMode) return
    const data = await fetchStats()
    if (data) { setStats(data); setOffline(false) }
    else       { setStats(null); setOffline(true) }
  }, [devMode])

  useEffect(() => {
    if (!devMode) { setStats(null); setOffline(false); return }
    refreshStats()
    const id = setInterval(refreshStats, POLL_MS)
    return () => clearInterval(id)
  }, [devMode, refreshStats])

  useEffect(() => {
    if (devMode || hasApiKey) setShowNoKey(false)
  }, [devMode, hasApiKey])

  const toggle = async () => {
    const next = !devMode
    if (next === false && !hasApiKey) { setShowNoKey(true); return }
    setShowNoKey(false)
    localStorage.setItem('devMode', String(next))
    setDevMode(next)
    if (next) {
      const data = await fetchStats()
      if (data) { setStats(data); setOffline(false) }
      else       { setStats(null); setOffline(true) }
    } else {
      setStats(null); setOffline(false)
    }
  }

  const searches = stats ? stats.tavilySearches + stats.ddgSearches : 0

  let label: string
  let pillCls: string

  if (!devMode) {
    label   = '☁ PROD'
    pillCls = 'bg-blue-600 hover:bg-blue-700 text-white'
  } else if (offline) {
    label   = '⚠ Proxy offline'
    pillCls = 'bg-red-500 hover:bg-red-600 text-white'
  } else if (stats) {
    const reset = formatResetDate(stats.resetDate)
    label   = `🔧 DEV · ${searches}/${stats.limit} · resets ${reset}`
    pillCls = 'bg-emerald-600 hover:bg-emerald-700 text-white'
  } else {
    label   = '🔧 DEV'
    pillCls = 'bg-emerald-600 hover:bg-emerald-700 text-white'
  }

  const title = !devMode
    ? 'Production mode — direct Anthropic API (your key)\nClick to switch to free DEV mode'
    : offline
      ? `DEV mode active but Cloudflare Worker is unreachable.\nCheck: ${PROXY_URL}/stats`
      : stats
        ? `DEV mode — free Groq + Tavily\n${stats.tavilySearches} Tavily / ${stats.ddgSearches} DDG searches this month\n${stats.remaining} Tavily remaining · resets ${formatResetDate(stats.resetDate)}\nClick to switch to PROD`
        : 'DEV mode — free Groq + Tavily\nClick to switch to PROD'

  return (
    <div className="relative flex flex-col items-end gap-1.5">
      <button
        onClick={toggle}
        title={title}
        className={`px-3 py-1 rounded-full text-xs font-mono font-semibold shadow-md transition-colors cursor-pointer ${pillCls}`}
      >
        {label}
      </button>

      {showNoKey && (
        <div className="absolute top-full mt-1.5 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300 max-w-[220px] text-right leading-relaxed shadow-lg shadow-slate-200/60 dark:shadow-slate-900/60 z-50">
          PROD requires an API key.{' '}
          <button
            onClick={() => { setShowNoKey(false); onOpenAccount() }}
            className="text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer bg-transparent border-0 font-medium"
          >
            Add one in Settings
          </button>
        </div>
      )}
    </div>
  )
}
