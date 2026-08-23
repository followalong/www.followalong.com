const DESTINATIONS = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/following', label: 'Feeds', icon: 'feeds' },
  { to: '/marketplace', label: 'Marketplace', short: 'Market', icon: 'market' },
  { to: '/settings', label: 'You', icon: 'you' }
]

// A feed page is a sub-page of Feeds, so it keeps that tab lit.
const OWNED_BY = {
  '/': (path) => path === '/' || path.startsWith('/signals'),
  '/following': (path) => path.startsWith('/following') || path.startsWith('/http'),
  '/marketplace': (path) => path.startsWith('/marketplace') || path.startsWith('/add-ons'),
  '/settings': (path) => path.startsWith('/settings') || path.startsWith('/help')
}

export default DESTINATIONS

export { DESTINATIONS, OWNED_BY }
