// What one device has to tell another so it can pull the identity down for
// itself: the remote's config, and the key to open it. Not the log. The whole
// point is that this fits in something a camera can read.
const PREFIX = 'setup='

const toBase64Url = (text) => {
  const bytes = new TextEncoder().encode(text)

  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

const fromBase64Url = (text) => {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}

const encodeHandoff = (payload) => `${PREFIX}${toBase64Url(JSON.stringify(payload))}`

const decodeHandoff = (hash) => {
  const at = `${hash || ''}`.indexOf(PREFIX)

  if (at === -1) return null

  try {
    const payload = JSON.parse(fromBase64Url(`${hash}`.slice(at + PREFIX.length)))

    return payload && payload.t ? payload : null
  } catch (e) {
    return null
  }
}

export { encodeHandoff, decodeHandoff }
