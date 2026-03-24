import { useState, useEffect, useCallback } from 'react'

const PROXY_URL = 'http://localhost:8788'
const POLL_MS   = 5000

interface ProxyStats {
  tavilySearches: number
  ddgSearches:   number
  limit:         number
  remaining:     number
  resetDate:     string
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

export default function DevModeToggle() {
  const [devMode, setDevMode] = useState(() => localStorage.getItem('devMode') === 'true')
  const [stats,   setStats]   = useState<ProxyStats | null>(null)
  const [offline, setOffline] = useState(false)

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

  const toggle = async () => {
    const next = !devMode
    localStorage.setItem('devMode', String(next))
    setDevMode(next)
    if (next) {
      const data = await fetchStats()
      if (data) { setStats(data); setOffline(false) }
      else       { setStats(null); setOffline(true) }
    } else {
      setStats(null)
      setOffline(false)
    }
  }

  const searches = stats ? stats.tavilySearches + stats.ddgSearches : 0

  let label: string
  let title: string
  let pillClass: string

  if (!devMode) {
    label     = '☁ PROD'
    title     = 'Production mode — paid Cloudflare Worker (Claude)\nClick to switch to free local DEV mode'
    pillClass = 'bg-blue-600 hover:bg-blue-700'
  } else if (offline) {
    label     = '⚠ Proxy offline'
    title     = `DEV mode active but proxy is not running.\nStart it: cd /c/Code/dev-proxy && node index.js`
    pillClass = 'bg-red-600 hover:bg-red-700'
  } else if (stats) {
    const reset = formatResetDate(stats.resetDate)
    label     = `🔧 DEV · ${searches}/${stats.limit} 🔍 · resets ${reset}`
    title     = `DEV mode — free local AI (Ollama + Tavily)\n${stats.tavilySearches} Tavily / ${stats.ddgSearches} DDG searches this month\n${stats.remaining} Tavily searches remaining · resets ${reset}\nClick to switch to PROD`
    pillClass = 'bg-green-700 hover:bg-green-800'
  } else {
    label     = '🔧 DEV'
    title     = 'DEV mode — free local AI (Ollama)\nClick to switch to PROD'
    pillClass = 'bg-green-700 hover:bg-green-800'
  }

  return (
    <button
      onClick={toggle}
      title={title}
      className={`fixed top-3 right-3 z-50 px-3 py-1 rounded-full text-white text-xs font-mono font-semibold shadow-lg transition-colors ${pillClass}`}
    >
      {label}
    </button>
  )
}
