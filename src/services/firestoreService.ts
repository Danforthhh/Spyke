import { doc, getDoc, setDoc, deleteField, updateDoc, collection, addDoc, getDocs, deleteDoc, orderBy, query, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from './firebase'
import type { EncryptedKeyBundle, SavedReport } from '../types'

// Firestore path: users/{uid}/settings (single document per user)

export interface UserSettings {
  encryptedKey: string
  keySalt: string
  keyIv: string
}

export async function getUserSettings(uid: string): Promise<UserSettings | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'settings', 'apiKey'))
  if (!snap.exists()) return null
  return snap.data() as UserSettings
}

export async function saveEncryptedKey(uid: string, bundle: EncryptedKeyBundle): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'settings', 'apiKey'), {
    encryptedKey: bundle.encryptedKey,
    keySalt:      bundle.keySalt,
    keyIv:        bundle.keyIv,
  })
}

export async function removeEncryptedKey(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'settings', 'apiKey'), {
    encryptedKey: deleteField(),
    keySalt:      deleteField(),
    keyIv:        deleteField(),
  })
}

// ── Report persistence ──────────────────────────────────────────────────────
// Path: users/{uid}/reports/{auto-id}
// Firestore rules must allow: match /users/{uid}/reports/{r} { allow read, write: if request.auth.uid == uid; }

export async function saveReport(uid: string, competitor: string, html: string): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'reports'), {
    competitor,
    html,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function listReports(uid: string): Promise<SavedReport[]> {
  const q = query(collection(db, 'users', uid, 'reports'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      competitor: data.competitor as string,
      html: data.html as string,
      createdAt: (data.createdAt as Timestamp)?.toMillis() ?? Date.now(),
    }
  })
}

export async function deleteReport(uid: string, reportId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'reports', reportId))
}
