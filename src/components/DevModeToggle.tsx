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
  const [devMode,    setDevMode]    = useState(() => localStorage.getItem('devMode') === 'true')
  const [stats,      setStats]      = useState<ProxyStats | null>(null)
  const [offline,    setOffline]    = useState(false)
  const [showNoKey,  setShowNoKey]  = useState(false)

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

  // Hide the "no key" tooltip when user switches back to DEV or gains a key
  useEffect(() => {
    if (devMode || hasApiKey) setShowNoKey(false)
  }, [devMode, hasApiKey])

  const toggle = async () => {
    const next = !devMode
    // Switching to PROD requires an API key
    if (next === false && !hasApiKey) {
      setShowNoKey(true)
      return
    }
    setShowNoKey(false)
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
    title     = 'Production mode — direct Anthropic API (your key)\nClick to switch to free DEV mode'
    pillClass = 'bg-blue-600 hover:bg-blue-700'
  } else if (offline) {
    label     = '⚠ Proxy offline'
    title     = `DEV mode active but Cloudflare Worker is unreachable.\nCheck: https://dev-proxy.vin-bories.workers.dev/stats`
    pillClass = 'bg-red-600 hover:bg-red-700'
  } else if (stats) {
    const reset = formatResetDate(stats.resetDate)
    label     = `🔧 DEV · ${searches}/${stats.limit} 🔍 · resets ${reset}`
    title     = `DEV mode — free Groq + Tavily (Cloudflare Worker)\n${stats.tavilySearches} Tavily / ${stats.ddgSearches} DDG searches this month\n${stats.remaining} Tavily searches remaining · resets ${reset}\nClick to switch to PROD`
    pillClass = 'bg-green-700 hover:bg-green-800'
  } else {
    label     = '🔧 DEV'
    title     = 'DEV mode — free Groq + Tavily (Cloudflare Worker)\nClick to switch to PROD'
    pillClass = 'bg-green-700 hover:bg-green-800'
  }

  return (
    <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <button
        onClick={toggle}
        title={title}
        className={`px-3 py-1 rounded-full text-white text-xs font-mono font-semibold shadow-lg transition-colors ${pillClass}`}
      >
        {label}
      </button>

      {showNoKey && (
        <div style={{
          background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8,
          padding: '8px 12px', fontSize: 12, color: '#ccc',
          maxWidth: 230, textAlign: 'right', lineHeight: 1.5,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          PROD requires an API key.{' '}
          <button
            onClick={() => { setShowNoKey(false); onOpenAccount() }}
            style={{ background: 'none', border: 'none', color: '#6c63ff', cursor: 'pointer', fontSize: 12, padding: 0 }}
          >
            Add one in Settings
          </button>
        </div>
      )}
    </div>
  )
}
