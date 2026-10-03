const DESTINATIONS = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/following', label: 'Feeds', icon: 'feeds' },
  { to: '/marketplace', label: 'Marketplace', short: 'Market', icon: 'market' },
  { to: '/settings', label: 'You', icon: 'you' }
]

// A sub-page keeps its parent tab lit: a feed page is Feeds, and everything
// reached from You is You.
const UNDER_YOU = ['/settings', '/help', '/about', '/terms', '/privacy', '/storage']

const OWNED_BY = {
  '/': (path) => path === '/' || path.startsWith('/signals'),
  '/following': (path) => path.startsWith('/following') || path.startsWith('/http'),
  '/marketplace': (path) => path.startsWith('/marketplace') || path.startsWith('/add-ons'),
  '/settings': (path) => UNDER_YOU.some((prefix) => path.startsWith(prefix))
}

export default DESTINATIONS

export { DESTINATIONS, OWNED_BY }
