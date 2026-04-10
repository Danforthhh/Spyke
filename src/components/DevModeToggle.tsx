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
    setSaving(true)
    setSaveError('')
    try {
      await onSaveKey(trimmed)
      setKeyInput('')
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
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 10,
          padding: '16px', width: 300,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 200,
        }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10, lineHeight: 1.6 }}>
            PROD mode uses your Anthropic API key.
          </div>
          <input
            type="password"
            placeholder="sk-ant-..."
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !saving && handleSave()}
            autoFocus
            autoComplete="off"
            style={{
              width: '100%', padding: '8px 10px', marginBottom: 8,
              background: '#0a0a1a', border: '1px solid #2a2a4a',
              borderRadius: 6, color: '#e0e0e0', fontSize: 12,
              outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={handleSave}
              disabled={saving || !keyInput.trim()}
              style={{
                flex: 1, padding: '7px 0',
                background: saving || !keyInput.trim() ? '#1a1a3a' : '#6c63ff',
                border: 'none', borderRadius: 6,
                color: saving || !keyInput.trim() ? '#555' : '#fff',
                fontSize: 12, fontWeight: 600,
                cursor: saving || !keyInput.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Save & switch to PROD'}
            </button>
            <button
              onClick={() => { setShowKeyForm(false); setKeyInput(''); setSaveError('') }}
              style={{
                padding: '7px 12px', background: 'none',
                border: '1px solid #2a2a4a', borderRadius: 6,
                color: '#888', fontSize: 12, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
          {saveError && (
            <div style={{ color: '#f44336', fontSize: 11, marginTop: 8 }}>{saveError}</div>
          )}
        </div>
      )}
    </div>
  )
}
