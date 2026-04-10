import { useState, useEffect, useCallback, useRef } from 'react'

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
  devMode:    boolean
  hasApiKey:  boolean
  onToggle:   (next: boolean) => void
  onSaveKey:  (key: string) => Promise<void>
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
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function DevModeToggle({ devMode, hasApiKey, onToggle, onSaveKey }: Props) {
  const [stats,       setStats]       = useState<ProxyStats | null>(null)
  const [offline,     setOffline]     = useState(false)
  const [showKeyForm, setShowKeyForm] = useState(false)
  const [keyInput,    setKeyInput]    = useState('')
  const [showKey,     setShowKey]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Close key form when clicking outside
  useEffect(() => {
    if (!showKeyForm) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowKeyForm(false)
        setKeyInput('')
        setSaveError('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showKeyForm])

  // Dismiss key form once a key is saved
  useEffect(() => {
    if (hasApiKey) setShowKeyForm(false)
  }, [hasApiKey])

  const handleToggle = () => {
    if (devMode && !hasApiKey) {
      // Switching from DEV to PROD but no key — show inline form instead
      setShowKeyForm(s => !s)
      return
    }
    setShowKeyForm(false)
    onToggle(!devMode)
  }

  const handleSave = async () => {
    const trimmed = keyInput.trim()
    if (!trimmed || saving) return
    if (!trimmed.startsWith('sk-ant-')) {
      setSaveError('Key must start with sk-ant-')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      await onSaveKey(trimmed)
      setKeyInput('')
      setShowKey(false)
      setShowKeyForm(false)
      onToggle(false) // switch to PROD after key is saved
    } catch {
      setSaveError('Failed to save key. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Pill appearance ────────────────────────────────────────────────────────
  const searches = stats ? stats.tavilySearches + stats.ddgSearches : 0

  let pillBg:    string
  let pillLabel: string
  let tooltip:   string

  if (!devMode) {
    pillBg    = '#2563eb'
    pillLabel = 'PROD'
    tooltip   = 'Production — Anthropic API (your key)\nClick to switch to free DEV mode'
  } else if (offline) {
    pillBg    = '#dc2626'
    pillLabel = '⚠ DEV'
    tooltip   = 'DEV mode — Cloudflare Worker unreachable\nCheck: dev-proxy.vin-bories.workers.dev/stats\nClick to switch to PROD'
  } else if (stats) {
    const reset = formatResetDate(stats.resetDate)
    pillBg    = '#15803d'
    pillLabel = 'DEV'
    tooltip   = `DEV mode — Groq + Tavily (free)\n${searches}/${stats.limit} searches used · resets ${reset}\n${stats.remaining} Tavily remaining\nClick to switch to PROD`
  } else {
    pillBg    = '#15803d'
    pillLabel = 'DEV'
    tooltip   = 'DEV mode — Groq + Tavily (free)\nClick to switch to PROD'
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={handleToggle}
        title={tooltip}
        style={{
          padding: '5px 14px', background: pillBg, border: 'none',
          borderRadius: 20, color: '#fff', fontSize: 12,
          fontFamily: 'monospace', fontWeight: 600, letterSpacing: 0.5,
          cursor: 'pointer', transition: 'filter 0.15s',
          lineHeight: 1.4,
        }}
        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.2)')}
        onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
      >
        {pillLabel}
      </button>

      {showKeyForm && (
        <div className="absolute top-full mt-2 right-0 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xl z-50">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
            PROD mode uses your Anthropic API key.
          </p>
          <div className="relative mb-2">
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="sk-ant-..."
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !saving && handleSave()}
              autoFocus
              autoComplete="off"
              className="w-full px-3 py-2 pr-12 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowKey(s => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer bg-transparent border-0 font-medium uppercase tracking-wide"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !keyInput.trim()}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                saving || !keyInput.trim()
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
              }`}
            >
              {saving ? 'Saving…' : 'Save & switch to PROD'}
            </button>
            <button
              onClick={() => { setShowKeyForm(false); setKeyInput(''); setSaveError('') }}
              className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
          {saveError && (
            <p className="text-xs text-red-500 mt-2">{saveError}</p>
          )}
        </div>
      )}
    </div>
  )
}
