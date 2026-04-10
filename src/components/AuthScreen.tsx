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

  return (
    <div className="fixed inset-0 bg-slate-50 flex items-center justify-center p-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-10 w-full max-w-sm shadow-lg shadow-slate-200/60">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 mb-3">
            <span className="text-white text-sm font-black tracking-tighter">S</span>
          </div>
          <div className="text-lg font-bold text-slate-900 tracking-tight">Spyke</div>
          <div className="text-xs text-slate-400 uppercase tracking-widest mt-0.5">Competitive Intelligence</div>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-4 mb-6 border-b border-slate-100 pb-4">
          {(['signin', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className={`text-sm font-semibold pb-1 border-b-2 transition-colors cursor-pointer bg-transparent border-0 border-b-2 ${
                mode === m
                  ? 'text-indigo-600 border-indigo-500'
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
              style={{ borderBottom: mode === m ? '2px solid #6366f1' : '2px solid transparent' }}
            >
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-all mt-1 ${
              loading
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 cursor-pointer'
            }`}
          >
            {loading ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
