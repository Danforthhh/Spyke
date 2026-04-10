import { useState } from 'react'
import { signOut, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
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

export default function AccountModal({ session, sessionPassword, hasKey, onKeyUpdated, onLogout, onClose }: Props) {
  const [editing,       setEditing]       = useState(false)
  const [newKey,        setNewKey]        = useState('')
  const [showKey,       setShowKey]       = useState(false)
  const [keyError,      setKeyError]      = useState('')
  const [savingKey,     setSavingKey]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [deleteError,   setDeleteError]   = useState('')

  const handleSaveKey = async () => {
    const trimmed = newKey.trim()
    if (!trimmed) return
    if (!trimmed.startsWith('sk-ant-')) {
      setKeyError('Key must start with sk-ant-')
      return
    }
    setSavingKey(true)
    setKeyError('')
    try {
      const bundle = await encryptApiKey(trimmed, sessionPassword)
      await saveEncryptedKey(session.uid, bundle)
      onKeyUpdated(trimmed)
      setEditing(false)
      setNewKey('')
      setShowKey(false)
    } catch {
      setKeyError('Failed to save key. Please try again.')
    } finally {
      setSavingKey(false)
    }
  }

  const handleRemoveKey = async () => {
    try {
      await removeEncryptedKey(session.uid)
      onKeyUpdated(null)
    } catch {
      // Removal failed — do not update UI state so user can retry
    }
  }

  const handleLogout = async () => {
    clearPersistedPassword()
    await signOut(auth)
    onLogout()
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      const currentUser = auth.currentUser
      if (!currentUser) throw new Error('No user')
      const credential = EmailAuthProvider.credential(session.email, sessionPassword)
      await reauthenticateWithCredential(currentUser, credential)
      // Delete Auth account first — if this succeeds, the user is gone regardless of cleanup
      await deleteUser(currentUser)
      // Best-effort Firestore cleanup (non-blocking — orphaned doc is unreachable without the uid)
      await removeEncryptedKey(session.uid).catch(() => {})
      clearPersistedPassword()
      onLogout()
    } catch (err: unknown) {
      const code = err instanceof FirebaseError ? err.code : ''
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setDeleteError('Re-authentication failed. Please sign out and sign back in before deleting.')
      } else {
        setDeleteError('Failed to delete account. Please try again.')
      }
    } finally {
      setDeleting(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all font-mono'

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-5"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-sm shadow-xl dark:shadow-slate-900/60"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Account</span>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-lg leading-none cursor-pointer bg-transparent border-0 p-1">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Email */}
          <div>
            <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Email</div>
            <div className="text-sm text-slate-700 dark:text-slate-300 font-mono">{session.email}</div>
          </div>

          {/* API Key */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
            <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Anthropic API Key</div>
            {!editing ? (
              <div>
                {hasKey ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-mono">sk-ant-••••••••••</span>
                    <button onClick={() => setEditing(true)} className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer bg-transparent border-0 font-medium">Edit</button>
                    <button onClick={handleRemoveKey} className="text-xs text-red-400 hover:text-red-600 cursor-pointer bg-transparent border-0 font-medium">Remove</button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 dark:text-slate-500">No key — PROD mode unavailable.</p>
                    <button onClick={() => setEditing(true)} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 cursor-pointer bg-transparent border-0">+ Add API key</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder="sk-ant-..."
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                    autoFocus
                    className={inputCls + ' pr-16'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(s => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer bg-transparent border-0 font-medium uppercase tracking-wide"
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                {keyError && <p className="text-xs text-red-500 dark:text-red-400">{keyError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveKey}
                    disabled={savingKey || !newKey.trim()}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      savingKey || !newKey.trim()
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
                    }`}
                  >
                    {savingKey ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditing(false); setNewKey(''); setKeyError('') }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <button
              onClick={handleLogout}
              className="w-full py-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>

          {/* Delete account */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 pb-1">
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="text-xs text-red-400 hover:text-red-600 cursor-pointer bg-transparent border-0 font-medium">
                Delete account
              </button>
            ) : (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl p-4 space-y-3">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">This permanently deletes your account and API key. This cannot be undone.</p>
                {deleteError && <p className="text-xs text-red-500 dark:text-red-400">{deleteError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      deleting ? 'bg-red-100 dark:bg-red-900/50 text-red-300 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
                    }`}
                  >
                    {deleting ? 'Deleting…' : 'Confirm delete'}
                  </button>
                  <button
                    onClick={() => { setConfirmDelete(false); setDeleteError('') }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
