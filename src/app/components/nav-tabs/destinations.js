const SAVED = '/signals/saved'

const DESTINATIONS = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/following', label: 'Feeds', icon: 'feeds' },
  { to: SAVED, label: 'Saved', icon: 'saved' },
  { to: '/settings', label: 'You', icon: 'you' }
]

// A sub-page keeps its parent tab lit: a feed page is Feeds, and everything
// reached from You is You.
const UNDER_YOU = ['/settings', '/help', '/about', '/terms', '/privacy', '/storage', '/marketplace', '/add-ons']

const OWNED_BY = {
  '/': (path) => path === '/' || (path.startsWith('/signals') && path !== SAVED),
  '/following': (path) => path.startsWith('/following') || path.startsWith('/http'),
  [SAVED]: (path) => path === SAVED,
  '/settings': (path) => UNDER_YOU.some((prefix) => path.startsWith(prefix))
}

export default DESTINATIONS

export { DESTINATIONS, OWNED_BY }
