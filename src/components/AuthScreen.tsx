import { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
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
      const code = err instanceof FirebaseError ? err.code : ''
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

  const inputCls = 'w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all'

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-5">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-10 w-full max-w-sm shadow-lg shadow-slate-200/60 dark:shadow-slate-900/60">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-100 mb-3">
            <span className="text-white dark:text-slate-900 text-sm font-black tracking-tighter">S</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Spyke</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Competitive Intelligence</div>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
          {(['signin', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className={`text-sm font-semibold pb-1 transition-colors cursor-pointer bg-transparent border-0 ${
                mode === m
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              style={{ borderBottom: mode === m ? '2px solid #6366f1' : '2px solid transparent' }}
            >
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className={inputCls} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} className={inputCls} />
          {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-all mt-1 ${
              loading
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/40 cursor-pointer'
            }`}
          >
            {loading ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
