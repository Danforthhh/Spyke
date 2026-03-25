import { doc, getDoc, setDoc, deleteField, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { EncryptedKeyBundle } from '../types'

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
