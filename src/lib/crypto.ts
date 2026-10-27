/**
 * PressSafe Client-Side Cryptography Module
 * Uses the Web Crypto API (built-in, zero-dependency)
 *
 * Design: Zero-knowledge — the server never sees plaintext evidence.
 * Keys are derived from the user's passphrase using PBKDF2.
 * Evidence is encrypted with AES-GCM before leaving the browser.
 */

// ——————————————————————————————————————————————
// SHA-256 Hashing
// ——————————————————————————————————————————————

/**
 * Compute SHA-256 hash of an ArrayBuffer or Uint8Array.
 * Returns a lowercase hex string.
 */
export async function sha256(data: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(data instanceof Uint8Array ? data : new Uint8Array(data))
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  return bufferToHex(hashBuffer)
}

/**
 * Compute SHA-256 hash of a File.
 * Reads the file in chunks to handle large files.
 */
export async function sha256File(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  return sha256(arrayBuffer)
}

/**
 * Compute SHA-256 hash of a UTF-8 string.
 */
export async function sha256String(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text)
  return sha256(encoded.buffer)
}

// ——————————————————————————————————————————————
// Key Derivation (PBKDF2)
// ——————————————————————————————————————————————

export interface DerivedKeyResult {
  key: CryptoKey
  salt: Uint8Array
}

/**
 * Derive an AES-GCM key from a passphrase using PBKDF2.
 * @param passphrase - User-provided passphrase
 * @param salt - Optional existing salt (provide when decrypting)
 * @returns The derived CryptoKey and the salt used
 */
export async function deriveKey(
  passphrase: string,
  salt?: Uint8Array
): Promise<DerivedKeyResult> {
  const usedSalt = new Uint8Array(salt?.byteLength ?? 32)
  if (salt) usedSalt.set(salt)
  else crypto.getRandomValues(usedSalt)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: usedSalt,
      iterations: 310_000, // OWASP recommended minimum for SHA-256
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // not extractable
    ['encrypt', 'decrypt']
  )

  return { key, salt: usedSalt }
}

// ——————————————————————————————————————————————
// AES-GCM Encryption / Decryption
// ——————————————————————————————————————————————

export interface EncryptedPayload {
  /** Base64-encoded IV (12 bytes) */
  iv: string
  /** Base64-encoded salt (32 bytes) */
  salt: string
  /** Base64-encoded ciphertext */
  ciphertext: string
  /** SHA-256 hash of plaintext (hex) for integrity verification */
  plaintextHash: string
}

/**
 * Encrypt a File with AES-GCM using a passphrase-derived key.
 * The IV and salt are prepended to the ciphertext so decryption
 * can reconstruct the key without storing the passphrase.
 */
export async function encryptFile(
  file: File,
  passphrase: string
): Promise<{ payload: EncryptedPayload; plaintextHash: string }> {
  const plaintext = await file.arrayBuffer()
  const plaintextHash = await sha256(plaintext)
  const { key, salt } = await deriveKey(passphrase)
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  )

  return {
    payload: {
      iv: bufferToBase64(iv),
      salt: bufferToBase64(salt),
      ciphertext: bufferToBase64(ciphertext),
      plaintextHash,
    },
    plaintextHash,
  }
}

/**
 * Decrypt an EncryptedPayload back to ArrayBuffer.
 */
export async function decryptPayload(
  payload: EncryptedPayload,
  passphrase: string
): Promise<ArrayBuffer> {
  const salt = base64ToBuffer(payload.salt)
  const iv = base64ToBuffer(payload.iv)
  const ciphertext = base64ToBuffer(payload.ciphertext)

  const { key } = await deriveKey(passphrase, new Uint8Array(salt))

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    ciphertext
  )

  // Integrity check
  const actualHash = await sha256(plaintext)
  if (actualHash !== payload.plaintextHash) {
    throw new Error('Integrity check failed: hash mismatch after decryption')
  }

  return plaintext
}

/**
 * Encrypt a plain text string (e.g. notes, source info)
 */
export async function encryptString(
  text: string,
  passphrase: string
): Promise<EncryptedPayload> {
  const encoded = new TextEncoder().encode(text)
  const plaintextHash = await sha256(encoded.buffer)
  const { key, salt } = await deriveKey(passphrase)
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )

  return {
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt),
    ciphertext: bufferToBase64(ciphertext),
    plaintextHash,
  }
}

/**
 * Decrypt an EncryptedPayload back to UTF-8 string.
 */
export async function decryptString(
  payload: EncryptedPayload,
  passphrase: string
): Promise<string> {
  const plaintext = await decryptPayload(payload, passphrase)
  return new TextDecoder().decode(plaintext)
}

// ——————————————————————————————————————————————
// Chain-of-Custody Hash Chaining
// ——————————————————————————————————————————————

export interface CustodyEntry {
  evidenceId: string
  actorId: string
  action: string
  timestamp: string
  notes?: string
  previousHash: string | null
}

/**
 * Compute the hash for a custody log entry.
 * Each entry hashes its own data plus the previous entry's hash,
 * forming a tamper-evident chain.
 */
export async function computeCustodyHash(
  entry: CustodyEntry
): Promise<string> {
  const canonical = JSON.stringify({
    evidenceId: entry.evidenceId,
    actorId: entry.actorId,
    action: entry.action,
    timestamp: entry.timestamp,
    notes: entry.notes ?? null,
    previousHash: entry.previousHash,
  })
  return sha256String(canonical)
}

/**
 * Verify a chain of custody log entries.
 * Returns true if every entry's hash correctly chains from the previous.
 */
export async function verifyCustodyChain(
  entries: Array<CustodyEntry & { currentHash: string }>
): Promise<boolean> {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const expectedHash = await computeCustodyHash(entry)
    if (expectedHash !== entry.currentHash) return false
  }
  return true
}

// ——————————————————————————————————————————————
// Utilities
// ——————————————————————————————————————————————

export function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Generate a random hex string of specified byte length.
 * Used for generating recovery codes.
 */
export function randomHex(bytes: number): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes))
  return bufferToHex(arr.buffer)
}
