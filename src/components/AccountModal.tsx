import { useState } from 'react'
import { signOut, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'firebase/auth'
import { deleteDoc, doc } from 'firebase/firestore'
import { auth, db } from '../services/firebase'
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
  const [editing,       setEditing]       = useState(false)
  const [keyInput,      setKeyInput]      = useState('')
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting,      setDeleting]      = useState(false)

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

  const handleDeleteAccount = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) return
    setDeleting(true)
    setError('')
    try {
      // Re-authenticate before deletion (Firebase requires this for sensitive operations)
      const credential = EmailAuthProvider.credential(session.email, sessionPassword)
      await reauthenticateWithCredential(currentUser, credential)
      // Delete Firestore data first, then the auth account
      await deleteDoc(doc(db, 'users', session.uid, 'settings', 'apiKey'))
      await deleteUser(currentUser)
      clearPersistedPassword()
      onLogout()
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Re-authentication failed. Please sign out and sign back in before deleting.')
      } else {
        setError('Failed to delete account. Please try again.')
      }
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
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
            cursor: 'pointer', marginBottom: 12,
          }}
        >
          Sign out
        </button>

        {/* Delete account */}
        {!confirmDelete ? (
          <button
            onClick={() => { setConfirmDelete(true); setError('') }}
            style={{
              width: '100%', padding: '11px 0',
              background: 'none', border: '1px solid #3a1a1a',
              borderRadius: 8, color: '#7a3a3a', fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Delete account
          </button>
        ) : (
          <div style={{
            padding: '16px', border: '1px solid #5a2a2a',
            borderRadius: 8, background: '#1a0a0a',
          }}>
            <div style={{ fontSize: 13, color: '#f44336', marginBottom: 12, lineHeight: 1.5 }}>
              This permanently deletes your account and API key. This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{
                  flex: 1, padding: '9px 0',
                  background: deleting ? '#2a0a0a' : '#c0392b',
                  border: 'none', borderRadius: 8,
                  color: deleting ? '#666' : '#fff',
                  fontSize: 13, fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                {deleting ? 'Deleting…' : 'Confirm delete'}
              </button>
              <button
                onClick={() => { setConfirmDelete(false); setError('') }}
                disabled={deleting}
                style={{
                  flex: 1, padding: '9px 0',
                  background: 'none', border: '1px solid #2a2a4a',
                  borderRadius: 8, color: '#888', fontSize: 13,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
            {error && (
              <div style={{ color: '#f44336', fontSize: 12, marginTop: 8 }}>{error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
