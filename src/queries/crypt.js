/* global globalThis */
// WebCrypto, not a Node crypto library. aes256 needs Buffer and
// crypto.createHash, neither of which a browser has, so every encrypt threw at
// runtime and the only caller swallowed it — nothing was ever encrypted. There
// is therefore no existing ciphertext to stay compatible with.
const PREFIX = 'fa2:'
const ITERATIONS = 200000
const SALT_BYTES = 16
const IV_BYTES = 12

const subtle = () => {
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    throw new Error('This browser cannot encrypt (no WebCrypto).')
  }

  return globalThis.crypto.subtle
}

const toBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))

const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0))

const deriveKey = (password, salt) => {
  const encoded = new TextEncoder().encode(password)

  return subtle()
    .importKey('raw', encoded, 'PBKDF2', false, ['deriveKey'])
    .then((material) => subtle().deriveKey(
      { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    ))
}

// Deriving is deliberately expensive, so it happens once per salt rather than
// once per event — a log of a few hundred events would otherwise take minutes.
// The salt defends against precomputation across identities; per-message
// uniqueness comes from the IV, which is fresh every time.
const memoDerive = () => {
  const cache = {}

  return (password, salt, saltKey) => {
    cache[saltKey] = cache[saltKey] || deriveKey(password, salt)

    return cache[saltKey]
  }
}

const passThrough = () => (data) => Promise.resolve(data)

const isEncrypted = (data) => typeof data === 'string' && data.indexOf(PREFIX) === 0

const encrypt = (password) => {
  if (!password) return passThrough()

  const derive = memoDerive()
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const saltKey = toBase64(salt)

  return (data) => {
    if (data === null || typeof data === 'undefined') return Promise.resolve(data)

    const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES))

    return derive(password, salt, saltKey)
      .then((key) => subtle().encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(`${data}`)
      ))
      .then((cipher) => `${PREFIX}${saltKey}:${toBase64(iv)}:${toBase64(cipher)}`)
  }
}

const decrypt = (password) => {
  const derive = memoDerive()

  return (data) => {
    // Written before this identity was encrypted.
    if (!isEncrypted(data)) return Promise.resolve(data)

    if (!password) {
      return Promise.reject(new Error('This log is encrypted and no password was given.'))
    }

    const [salt, iv, cipher] = data.slice(PREFIX.length).split(':')

    return derive(password, fromBase64(salt), salt)
      .then((key) => subtle().decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, key, fromBase64(cipher)))
      .then((plain) => new TextDecoder().decode(plain))
      // AES-GCM is authenticated, so a wrong password fails here rather than
      // handing back plausible nonsense.
      .catch(() => { throw new Error('Could not decrypt with that password.') })
  }
}

export { encrypt, decrypt, passThrough, isEncrypted }
