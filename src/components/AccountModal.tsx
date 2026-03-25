import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../services/firebase'
import { encryptApiKey, clearPersistedPassword } from '../services/cryptoService'
import { saveEncryptedKey, removeEncryptedKey } from '../services/firestoreService'
import type { Session } from '../types'

interface Props {
  session: Session
  sessionPassword: string
  hasKey: boolean
  onKeyUpdated: (newKey: string | null) => void
  onLogout: () => void
  onClose: () => void
}

export default function AccountModal({
  session, sessionPassword, hasKey, onKeyUpdated, onLogout, onClose,
}: Props) {
  const [editing,  setEditing]  = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const handleSaveKey = async () => {
    const trimmed = keyInput.trim()
    if (!trimmed) return
    setSaving(true)
    setError('')
    try {
      const bundle = await encryptApiKey(trimmed, sessionPassword)
      await saveEncryptedKey(session.uid, bundle)
      onKeyUpdated(trimmed)
      setEditing(false)
      setKeyInput('')
    } catch {
      setError('Failed to save key. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveKey = async () => {
    setSaving(true)
    setError('')
    try {
      await removeEncryptedKey(session.uid)
      onKeyUpdated(null)
    } catch {
      setError('Failed to remove key. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    clearPersistedPassword()
    await signOut(auth)
    onLogout()
  }

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '9px 12px', background: '#0a0a1a',
    border: '1px solid #2a2a4a', borderRadius: 8, color: '#e0e0e0',
    fontSize: 13, outline: 'none', fontFamily: 'monospace',
  }

  const smBtnStyle = (color = '#6c63ff'): React.CSSProperties => ({
    padding: '7px 14px', background: 'none',
    border: `1px solid ${color}`, borderRadius: 8,
    color, fontSize: 12, cursor: saving ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap' as const,
  })

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, fontFamily: 'system-ui, sans-serif',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 16,
        padding: '32px 28px', width: 420, maxWidth: 'calc(100vw - 40px)',
        boxShadow: '0 0 60px rgba(108,99,255,0.15)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: '#6c63ff', letterSpacing: 3, textTransform: 'uppercase', fontWeight: 600 }}>
            Account
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Email */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            Email
          </div>
          <div style={{ fontSize: 14, color: '#e0e0e0', fontFamily: 'monospace' }}>
            {session.email}
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1e1e3a', paddingTop: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
            Anthropic API Key
          </div>

          {!editing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {hasKey ? (
                <>
                  <span style={{ fontSize: 13, color: '#e0e0e0', fontFamily: 'monospace' }}>
                    sk-ant-••••••••••
                  </span>
                  <button onClick={() => { setEditing(true); setKeyInput('') }} style={smBtnStyle()}>
                    Edit
                  </button>
                  <button onClick={handleRemoveKey} disabled={saving} style={smBtnStyle('#f44336')}>
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 13, color: '#555' }}>
                    No key — PROD mode unavailable
                  </span>
                  <button onClick={() => { setEditing(true); setKeyInput('') }} style={smBtnStyle()}>
                    Add key
                  </button>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  autoFocus
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleSaveKey}
                  disabled={saving || !keyInput.trim()}
                  style={{
                    ...smBtnStyle(),
                    background: saving || !keyInput.trim() ? 'transparent' : '#6c63ff',
                    color: saving || !keyInput.trim() ? '#555' : '#fff',
                    border: '1px solid #6c63ff',
                  }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => { setEditing(false); setKeyInput(''); setError('') }} style={smBtnStyle('#888')}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{ color: '#f44336', fontSize: 12, marginTop: 8 }}>{error}</div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '11px 0',
            background: 'none', border: '1px solid #2a2a4a',
            borderRadius: 8, color: '#888', fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
