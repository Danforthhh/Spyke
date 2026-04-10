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
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-5">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-10 w-full max-w-sm shadow-lg shadow-slate-200/60 dark:shadow-slate-900/60">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-100 mb-3">
            <span className="text-white dark:text-slate-900 text-sm font-black tracking-tighter">S</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Spyke</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">Re-enter your password to decrypt your API key.</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{email}</div>
        </div>

        <form onSubmit={handleUnlock} className="space-y-3">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoFocus
            autoComplete="current-password"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all"
          />
          {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-all ${
              loading
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/40 cursor-pointer'
            }`}
          >
            {loading ? '…' : 'Unlock'}
          </button>
        </form>

        <button
          onClick={handleSignOut}
          className="mt-3 w-full py-2.5 text-sm text-slate-400 dark:text-slate-500 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
        >
          Sign in as a different user
        </button>
      </div>
    </div>
  )
}
