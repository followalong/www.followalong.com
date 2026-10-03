import { describe, test, expect, vi, beforeEach } from 'vitest'
import links, { bootWithLinks } from './links.js'

const SIGNIN = '#signin=123456&email=a%2Bb%40example.com'

// A browser window as far as the links need one: an address, a history to
// wipe the fragment from, and the two events a link arrives by.
const browser = (href) => {
  const url = new URL(href)
  const listeners = {}
  const window = {
    location: { href, pathname: url.pathname, search: url.search, hash: url.hash },
    history: { replaceState: vi.fn((state, title, address) => { window.location.href = `https://www.followalong.com${address}`; window.location.hash = '' }) },
    addEventListener: (name, fn) => { listeners[name] = fn }
  }

  window.arrives = (address) => listeners['open-url']({ detail: { url: address } })
  window.hashChanges = (hash) => {
    window.location.hash = hash
    window.location.href = `https://www.followalong.com${window.location.pathname}${hash}`
    listeners.hashchange()
  }

  return window
}

describe('links into the app', () => {
  let router
  let mount

  const boot = (href) => {
    const window = browser(href)

    bootWithLinks({ window, router }, mount)

    return window
  }

  beforeEach(() => {
    router = { push: vi.fn(), replace: vi.fn() }
    mount = vi.fn()
    links.handoff = ''
    links.signin = null
  })

  describe('at boot', () => {
    test('mounts with a setup fragment, and wipes it from the address bar first', () => {
      const window = boot('https://www.followalong.com/#setup=abc')

      expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/')
      expect(window.history.replaceState.mock.invocationCallOrder[0]).toBeLessThan(mount.mock.invocationCallOrder[0])
      expect(mount).toHaveBeenCalledWith('#setup=abc')
      expect(router.push).not.toHaveBeenCalled()
    })

    test('takes a sign in link to the You page, with the address as the service encoded it', () => {
      const window = boot(`https://www.followalong.com/${SIGNIN}`)

      expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/')
      expect(mount).toHaveBeenCalledWith('')
      expect(links.signin).toEqual({ code: '123456', email: 'a+b@example.com' })
      expect(router.push).toHaveBeenCalledWith('/settings')
    })

    test('leaves a plain address to the router', () => {
      const window = boot('https://www.followalong.com/https://feed.example/rss.xml?a=1')

      expect(window.history.replaceState).not.toHaveBeenCalled()
      expect(mount).toHaveBeenCalledWith('')
      expect(router.push).not.toHaveBeenCalled()
    })
  })

  describe('while the app is open', () => {
    test('routes a Universal Link', () => {
      boot('https://www.followalong.com/').arrives('https://www.followalong.com/https://feed.example/rss.xml')

      expect(router.push).toHaveBeenCalledWith('/https://feed.example/rss.xml')
    })

    test('routes the custom scheme the same way', () => {
      boot('https://www.followalong.com/').arrives('followalong://following')

      expect(router.push).toHaveBeenCalledWith('/following')
    })

    test('signs in from a link through either door', () => {
      const window = boot('https://www.followalong.com/')

      window.arrives(`followalong://settings${SIGNIN}`)

      expect(links.signin).toEqual({ code: '123456', email: 'a+b@example.com' })
      expect(router.push).toHaveBeenCalledWith('/settings')

      links.signin = null
      window.arrives(`https://www.followalong.com/${SIGNIN}`)

      expect(links.signin).toEqual({ code: '123456', email: 'a+b@example.com' })
    })

    test('hands a setup link over, and keeps the router on the page', () => {
      boot('https://www.followalong.com/').arrives('https://www.followalong.com/#setup=abc')

      expect(links.handoff).toEqual('#setup=abc')
      expect(router.push).not.toHaveBeenCalled()
    })

    test('reads a fragment pasted into the running tab, and wipes it', () => {
      const window = boot('https://www.followalong.com/following')

      window.hashChanges(SIGNIN)

      expect(links.signin).toEqual({ code: '123456', email: 'a+b@example.com' })
      expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/following')
      expect(router.push).toHaveBeenCalledWith('/settings')
    })

    test('ignores a fragment that is neither', () => {
      const window = boot('https://www.followalong.com/following')

      window.hashChanges('#top')

      expect(links.signin).toEqual(null)
      expect(window.history.replaceState).not.toHaveBeenCalled()
      expect(router.push).not.toHaveBeenCalled()
    })
  })
})
