import { useState } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from '../services/firebase'
import { persistPassword } from '../services/cryptoService'

interface Props {
  onLogin: (password: string) => void
}

type Mode = 'signin' | 'register'

export default function AuthScreen({ onLogin }: Props) {
  const [mode,     setMode]     = useState<Mode>('signin')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setError('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password)
      }
      persistPassword(password)
      onLogin(password)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setError('Wrong email or password.')
      } else if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.')
      } else if (code === 'auth/invalid-email') {
        setError('Invalid email address.')
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.')
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a moment.')
      } else if (code === 'auth/user-not-found') {
        setError('No account found with this email.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', background: '#0a0a1a',
    border: '1px solid #2a2a4a', borderRadius: 8, color: '#e0e0e0',
    fontSize: 14, outline: 'none', fontFamily: 'inherit',
  }

  const btnStyle: React.CSSProperties = {
    width: '100%', padding: '12px 0',
    background: loading ? '#1e1e3a' : '#6c63ff',
    border: 'none', borderRadius: 8,
    color: loading ? '#888' : '#fff',
    fontSize: 14, fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    marginTop: 8, transition: 'background 0.2s',
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
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: '#e0e0e0' }}>
            SPYKE
          </div>
          <div style={{ fontSize: 11, color: '#888', letterSpacing: 3, textTransform: 'uppercase', marginTop: 2 }}>
            Competitive Intelligence
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 28, borderBottom: '1px solid #1e1e3a', paddingBottom: 14 }}>
          {(['signin', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, padding: 0,
                color: mode === m ? '#6c63ff' : '#555',
                borderBottom: mode === m ? '2px solid #6c63ff' : '2px solid transparent',
                paddingBottom: 4,
              }}
            >
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            style={inputStyle}
          />
          {error && (
            <div style={{ color: '#f44336', fontSize: 13 }}>{error}</div>
          )}
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
