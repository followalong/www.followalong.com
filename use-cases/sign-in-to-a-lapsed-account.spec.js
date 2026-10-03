import { flushPromises } from '@vue/test-utils'
import { mountApp, describe, story, hostedService, accountId, fakeStoreKit, vi } from './helper.js'

const EMAIL = 'reader@example.com'

const FIRST = `
  0/identities/abc123/create/v2.1 {"name":"First device"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
`

const SECOND = `
  0/identities/xyz789/create/v2.1 {"name":"Second device"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/feeds/902/create/v2.1 {"url":"https://second.example/rss.xml","data":{"title":"Followed here"}}
`

const LAPSED = { status: 402, body: '{"error":"subscription_expired"}' }
const CLOSED = { status: 402, body: '{"error":"account_cancelled"}' }

// Signed in to an account the service will not read for this device yet. The
// token and this device's own identity are kept, nothing goes up, and the
// account's log is taken over once it is paid.
describe('Sign in to a lapsed account', () => {
  let service
  let storekit
  let openPage
  let app

  const settle = async () => {
    for (let i = 0; i < 8; i++) await app.wait()
  }

  const turn = async () => { for (let i = 0; i < 20; i++) await flushPromises() }

  // The first device signs in, puts its log up and is put away. Then the
  // account stops paying.
  const first = async (refuse = LAPSED) => {
    const one = await mountApp({ hostedFetch: service.fetch, state: { abc123: { config: {}, data: FIRST } } })

    await one.vm.commands.signInToAccount(one.vm.identity, { email: EMAIL, code: service.code })
    one.unmount()

    Object.assign(service, { refuse, subscribed: false, requests: [] })
  }

  const second = async (options = {}) => {
    app = await mountApp(Object.assign({ hostedFetch: service.fetch, openPage, state: { xyz789: { config: {}, data: SECOND } } }, options))

    await app.click('[aria-label="You"]')
  }

  const signIn = async () => {
    await app.find('[aria-label="Email"]').setValue(EMAIL)
    await app.click('[aria-label="Send code"]')
    await settle()
    await app.find('[aria-label="Code"]').setValue(service.code)
    await app.click('[aria-label="Sign in"]')
    await settle()
  }

  const paid = () => Object.assign(service, { refuse: null, subscribed: true })
  const has = (label) => app.find(`[aria-label="${label}"]`).exists()
  const account = () => app.vm.queries.accountForIdentity(app.vm.identity)
  const feeds = () => app.vm.queries.feedsForIdentity(app.vm.identity).map((feed) => app.vm.queries.urlForFeed(feed)).sort()

  beforeEach(() => {
    service = hostedService()
    storekit = fakeStoreKit()
    openPage = vi.fn(() => true)
  })

  afterEach(() => app.unmount())

  story('keeps the token and this device\'s own identity, and sends nothing up', async () => {
    await first()
    await second()
    await signIn()

    expect(app.vm.identity.id).toEqual('xyz789')
    expect(account()).toMatchObject({ email: EMAIL, pending: 'subscription_expired' })
    expect(app.vm.queries.syncStatusForIdentity(app.vm.identity)).toMatchObject({ status: 'off', reason: 'subscription_expired' })
    expect(app.text()).toContain(`Signed in as ${EMAIL}.`)
    expect(app.text()).toContain('Not backed up')
    expect(app.text()).toContain('Your subscription has lapsed. Renew it to sync again.')
    expect(has('Renew')).toEqual(true)
    expect(service.logs().filter((request) => request.method === 'PUT')).toEqual([])
    expect(service.body()).not.toContain('https://second.example/rss.xml')
  })

  // Stripe tells the service, and the panel asks until it hears. Feeds
  // followed while waiting come along.
  story('takes the account\'s identity over once it is paid, feeds and all', async () => {
    await first()
    await second()
    await signIn()
    app.vm.commands.followFeedsForIdentity(app.vm.identity, [{ url: 'https://later.example/rss.xml', title: 'Followed while waiting' }])

    await app.find('[aria-label="Renew"]').trigger('click')
    await turn()

    expect(openPage).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_1')

    paid()
    vi.advanceTimersByTime(5000)
    await turn()
    await settle()

    expect(app.vm.identity.id).toEqual('abc123')
    expect(account()).toEqual({ email: EMAIL, accountId: accountId(1), token: `tok_${EMAIL}` })
    expect(feeds()).toEqual(['https://foo.bar/rss.xml', 'https://later.example/rss.xml', 'https://second.example/rss.xml'])
    expect(service.body()).toContain('https://later.example/rss.xml')
    expect(app.text()).toContain('Your subscription is active.')
    expect(app.vm.queries.allIdentities().map((identity) => identity.id)).toEqual(['abc123'])
  })

  // A pull finishes the takeover behind the page; the page has to follow it
  // to the identity that now holds the account, or it keeps showing one the
  // store has already forgotten.
  story('follows the takeover when a pull finishes it', async () => {
    await first()
    await second()
    await signIn()

    paid()
    window.dispatchEvent(new Event('focus'))
    await settle()

    expect(app.vm.identity.id).toEqual('abc123')
    expect(app.vm.queries.allIdentities().map((identity) => identity.id)).toEqual(['abc123'])
  })

  story('takes it over at the next launch when it was paid meanwhile', async () => {
    await first()
    await second()
    await signIn()
    const store = app.vm.state

    app.unmount()
    paid()
    app = await mountApp({ hostedFetch: service.fetch, openPage, store })
    await settle()

    expect(app.vm.queries.allIdentities().map((identity) => identity.id)).toEqual(['abc123'])
    expect(app.vm.identity.id).toEqual('abc123')
    expect(service.body()).toContain('https://second.example/rss.xml')
  })

  story('offers nothing to buy for a closed account, and signing out forgets it', async () => {
    await first(CLOSED)
    await second()
    await signIn()

    expect(account()).toMatchObject({ pending: 'account_cancelled' })
    expect(app.text()).toContain('This account is closed, so syncing has stopped.')
    expect(has('Renew')).toEqual(false)
    expect(has('Subscribe')).toEqual(false)

    await app.click('[aria-label="Sign out"]')
    await settle()

    expect(account()).toEqual(null)
    expect(has('Email')).toEqual(true)
  })

  describe('in the iOS build', () => {
    story('renews through the App Store and takes the account over', async () => {
      await first()
      await second({ storekit })
      await signIn()

      expect(has('Renew')).toEqual(false)

      await app.click('[aria-label="Renew, $2.99 a month"]')
      await settle()

      expect(service.transactions).toEqual([`jws.${accountId(1)}.1`])
      expect(app.vm.identity.id).toEqual('abc123')
      expect(service.body()).toContain('https://second.example/rss.xml')
      expect(app.text()).toContain('Your subscription is active.')
    })

    story('restores a subscription the Apple Account holds and takes the account over', async () => {
      await first()
      await second({ storekit })
      await signIn()
      storekit.owned.push(`jws.${accountId(1)}.1`)

      await app.click('[aria-label="Restore purchases"]')
      await settle()

      expect(app.vm.identity.id).toEqual('abc123')
      expect(service.body()).toContain('https://second.example/rss.xml')
    })
  })
})
