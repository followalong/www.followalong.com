import { reactive } from 'vue'

// Links into the app, through three doors: the address bar at boot, a
// fragment pasted into the running tab, and the native shell, which leaves a
// Universal Link (https://www.followalong.com/...) or the custom scheme
// (followalong://...) on `window` and fires `open-url`. Each is read once, and a fragment
// that carries credentials leaves the address bar in the same breath.
const SETUP = '#setup='
const SIGNIN = '#signin='

// Where the app is told what arrived. The shell watches `handoff`; the
// account panel takes `signin`.
const links = reactive({ handoff: '', signin: null, waiting: null })

// Path and fragment, whichever door. The custom scheme puts the path's first
// segment where a URL keeps its host, so this is not `new URL()`.
const split = (url) => {
  const [address, ...fragment] = `${url}`.split('#')
  const path = address.replace(/^followalong:\/\//, '/').replace(/^https?:\/\/[^/]*/, '')

  return { path: path || '/', hash: fragment.length ? `#${fragment.join('#')}` : '' }
}

// Never decoded first: the service sends `+` as `%2B`, and a decoded `+`
// would read as a space.
const signInFrom = (hash) => {
  const link = new URLSearchParams(hash.slice(1))

  return { code: link.get('signin'), email: link.get('email') || '' }
}

const follow = (url, router) => {
  if (links.waiting) return links.waiting.push(url)

  const { path, hash } = split(url)

  if (hash.startsWith(SETUP)) {
    links.handoff = hash
  } else if (hash.startsWith(SIGNIN)) {
    links.signin = signInFrom(hash)
    router.push('/settings')
  } else {
    router.push(path)
  }
}

// The shell's first paint sends / to the default signal, which cancels any
// navigation still in flight, so a link that arrives before it waits for it.
const holdLinks = () => { links.waiting = [] }

const releaseLinks = (router) => {
  const urls = links.waiting || []

  links.waiting = null
  urls.forEach((url) => follow(url, router))
}

const wipe = ({ location, history }) => history.replaceState(null, '', `${location.pathname}${location.search || ''}`)

// Reads the address the app booted with, wipes its fragment, mounts the app
// (with the setup fragment, which the shell reads once), then follows a sign
// in link, and listens for every link that arrives while the app runs.
const bootWithLinks = ({ window, router }, mount) => {
  const href = window.location.href
  const { hash } = split(href)
  const setup = hash.startsWith(SETUP)

  if (hash) wipe(window)

  mount(setup ? hash : '')

  if (hash && !setup) follow(href, router)

  // The native shell leaves each link on `window` before it says so, because
  // the one that launched the app can come before this listens.
  const take = () => (window.followalongLinks || []).splice(0).forEach((url) => follow(url, router))

  take()
  window.addEventListener('open-url', take)
  window.addEventListener('hashchange', () => {
    const { hash } = split(window.location.href)

    if (!hash.startsWith(SETUP) && !hash.startsWith(SIGNIN)) return

    wipe(window)
    follow(`${window.location.pathname}${hash}`, router)
  })
}

export { bootWithLinks, follow, holdLinks, releaseLinks, split }
export default links
