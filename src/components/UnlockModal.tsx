import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../services/firebase'
import { decryptApiKey, persistPassword, clearPersistedPassword } from '../services/cryptoService'
import { getUserSettings } from '../services/firestoreService'

interface Props {
  uid: string
  email: string
  onUnlocked: (apiKey: string | null, password: string) => void
}

export default function UnlockModal({ uid, email, onUnlocked }: Props) {
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setError('')
    setLoading(true)
    try {
      const settings = await getUserSettings(uid)
      if (!settings?.encryptedKey) {
        // User has no key stored — unlock without decryption
        persistPassword(password)
        onUnlocked(null, password)
        return
      }
      const decrypted = await decryptApiKey(settings, password)
      if (decrypted === null) {
        setError('Wrong password.')
        return
      }
      persistPassword(password)
      onUnlocked(decrypted, password)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    clearPersistedPassword()
    await signOut(auth)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0f0f23',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 16,
        padding: '40px 36px', width: 400, maxWidth: 'calc(100vw - 40px)',
        boxShadow: '0 0 60px rgba(108,99,255,0.15)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: '#e0e0e0' }}>
            SPYKE
          </div>
          <div style={{ fontSize: 11, color: '#888', letterSpacing: 3, textTransform: 'uppercase', marginTop: 2 }}>
            Unlock session
          </div>
        </div>

        <div style={{ fontSize: 13, color: '#888', marginBottom: 20, textAlign: 'center' }}>
          Re-enter your password to decrypt your API key.
          <br />
          <span style={{ color: '#555', fontSize: 12 }}>{email}</span>
        </div>

        <form onSubmit={handleUnlock} style={{ display: 'grid', gap: 14 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoFocus
            autoComplete="current-password"
            style={{
              width: '100%', padding: '11px 14px', background: '#0a0a1a',
              border: '1px solid #2a2a4a', borderRadius: 8, color: '#e0e0e0',
              fontSize: 14, outline: 'none', fontFamily: 'inherit',
            }}
          />
          {error && (
            <div style={{ color: '#f44336', fontSize: 13 }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px 0',
              background: loading ? '#1e1e3a' : '#6c63ff',
              border: 'none', borderRadius: 8,
              color: loading ? '#888' : '#fff',
              fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? '…' : 'Unlock'}
          </button>
        </form>

        <button
          onClick={handleSignOut}
          style={{
            marginTop: 16, width: '100%', padding: '10px 0',
            background: 'none', border: '1px solid #1e1e3a',
            borderRadius: 8, color: '#555', fontSize: 13, cursor: 'pointer',
          }}
        >
          Sign in as a different user
        </button>
      </div>
    </div>
  )
}
