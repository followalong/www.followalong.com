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

// Read once, at boot, and wiped from the address bar in the same breath. The
// app's first navigation throws the fragment away, and it carries the bucket's
// credentials, so neither the router nor the URL bar gets to keep it.
const takeHandoffFromLocation = (location, history) => {
  const hash = `${location.hash || ''}`

  if (!hash) return ''

  history.replaceState(null, '', `${location.pathname}${location.search || ''}`)

  return hash
}

export { encodeHandoff, decodeHandoff, takeHandoffFromLocation }
