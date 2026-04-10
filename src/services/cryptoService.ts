/**
 * Client-side encryption for Anthropic API keys.
 *
 * Security model:
 *  - Password hashed with PBKDF2-SHA256 (100k iterations) before storage
 *  - API key encrypted with AES-GCM-256; key derived from user password via PBKDF2
 *  - Two separate PBKDF2 salts: one for the password hash, one for the AES key derivation
 *  - Decrypted key never persisted to localStorage or Firestore
 *  - Password stored in sessionStorage for same-tab auto-decrypt on reload; cleared on logout/tab close
 */

import type { EncryptedKeyBundle } from '../types'

const PBKDF2_ITERATIONS         = 600_000
const PBKDF2_ITERATIONS_LEGACY  = 100_000
const SESSION_PW_KEY    = 'spyke_session_pw'

// ── Hex helpers ────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(hex.length / 2)
  const arr = new Uint8Array(buf)
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return arr
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function randomHex(byteCount: number): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(byteCount)))
}

// ── PBKDF2 helpers ─────────────────────────────────────────────────────────

async function getKeyMaterial(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey'],
  )
}

async function deriveAesKey(
  password: string,
  saltHex: string,
  usage: 'encrypt' | 'decrypt',
): Promise<CryptoKey> {
  const keyMaterial = await getKeyMaterial(password)
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage],
  )
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Hash a password for Firestore storage (hex string).
 * Uses a separate salt from the AES key derivation salt.
 */
export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const keyMaterial = await getKeyMaterial(password)
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    256,
  )
  return bytesToHex(new Uint8Array(bits))
}

/**
 * Encrypt an Anthropic API key string.
 * Returns an EncryptedKeyBundle (all fields are hex strings).
 */
export async function encryptApiKey(apiKey: string, password: string): Promise<EncryptedKeyBundle> {
  const keySalt = randomHex(16)
  const keyIv   = randomHex(12)
  const aesKey  = await deriveAesKey(password, keySalt, 'encrypt')
  const cipher  = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: hexToBytes(keyIv) },
    aesKey,
    new TextEncoder().encode(apiKey),
  )
  return {
    encryptedKey: bytesToHex(new Uint8Array(cipher)),
    keySalt,
    keyIv,
  }
}

/**
 * Decrypt an Anthropic API key.
 * Returns null if the password is wrong or the ciphertext was tampered with.
 *
 * Migration: tries current iteration count (600k) first; if that fails,
 * falls back to the legacy count (100k). Callers should re-encrypt with
 * encryptApiKey() and persist when the legacy path succeeds, so the bundle
 * is silently upgraded on next unlock.
 */
export async function decryptApiKey(bundle: EncryptedKeyBundle, password: string): Promise<string | null> {
  if (!bundle.encryptedKey) return null

  // Try current iteration count first
  try {
    const aesKey = await deriveAesKey(password, bundle.keySalt, 'decrypt')
    const plain  = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: hexToBytes(bundle.keyIv) },
      aesKey,
      hexToBytes(bundle.encryptedKey),
    )
    return new TextDecoder().decode(plain)
  } catch { /* fall through to legacy */ }

  // Legacy fallback: bundle was encrypted with 100k iterations
  try {
    const legacyKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(bundle.keySalt), iterations: PBKDF2_ITERATIONS_LEGACY },
      await getKeyMaterial(password),
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    )
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: hexToBytes(bundle.keyIv) },
      legacyKey,
      hexToBytes(bundle.encryptedKey),
    )
    return new TextDecoder().decode(plain)
  } catch {
    return null
  }
}

// ── sessionStorage helpers ─────────────────────────────────────────────────

/** Persist password for same-tab auto-decrypt on page reload. Cleared on logout or tab close. */
export function persistPassword(password: string): void {
  sessionStorage.setItem(SESSION_PW_KEY, password)
}

export function getPersistedPassword(): string | null {
  return sessionStorage.getItem(SESSION_PW_KEY)
}

export function clearPersistedPassword(): void {
  sessionStorage.removeItem(SESSION_PW_KEY)
}
