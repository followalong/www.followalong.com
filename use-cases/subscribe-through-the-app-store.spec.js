import { mountApp, describe, story, test, hostedService, fakeStoreKit, vi } from './helper.js'

const EMAIL = 'reader@example.com'
const MONTHLY = 'com.followalong.reader.sync.monthly'
const YEARLY = 'com.followalong.reader.sync.yearly'

const SEED = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
`

const NEVER_PAID = { status: 402, body: '{"error":"no_subscription"}' }
const LAPSED = { status: 402, body: '{"error":"subscription_expired"}' }

// The iOS build. App Store guideline 3.1.1: a subscription is sold through
// Apple there, and the web checkout is never linked to.
describe('Subscribe through the App Store', () => {
  let app
  let service
  let storekit
  let openPage

  const settle = async () => {
    for (let i = 0; i < 8; i++) await app.wait()
  }

  // Signed in on the You page, to an account the service refuses to sync. An
  // account that never paid can be signed in to; one that lapsed did so after.
  const open = async ({ refuse = NEVER_PAID } = {}) => {
    if (refuse === NEVER_PAID) Object.assign(service, { refuse, subscribed: false })

    app = await mountApp({ hostedFetch: service.fetch, storekit, openPage, state: { abc123: { config: {}, data: SEED } } })

    await app.vm.commands.signInToAccount(app.vm.identity, { email: EMAIL, code: service.code })

    Object.assign(service, { refuse, subscribed: false })

    await app.vm.commands.syncIdentity(app.vm.identity)
    await app.click('[aria-label="You"]')
    await settle()
  }

  const has = (label) => app.find(`[aria-label="${label}"]`).exists()
  const asked = (path) => service.requests.some((request) => request.path === path)

  beforeEach(() => {
    service = hostedService()
    storekit = fakeStoreKit()
    openPage = vi.fn(() => true)
  })

  afterEach(() => app.unmount())

  story('shows the App Store prices and buys one, then syncs', async () => {
    await open()

    expect(app.text()).toContain('Your feeds are not syncing. Subscribe to keep them on every device.')
    expect(has('Subscribe, $2.99 a month')).toEqual(true)
    expect(has('Subscribe, $24.99 a year')).toEqual(true)

    await app.click('[aria-label="Subscribe, $24.99 a year"]')
    await settle()

    expect(storekit.calls).toContainEqual(['purchase', YEARLY, 'acc_1'])
    expect(service.transactions).toEqual(['jws.acc_1.1'])
    expect(app.text()).toContain('Your subscription is active.')
    expect(app.text()).not.toContain('Your feeds are not syncing.')
    expect(service.body()).toContain('https://foo.bar/rss.xml')
  })

  story('never links to the web checkout or billing page', async () => {
    await open()

    expect(has('Subscribe')).toEqual(false)
    expect(has('Manage subscription')).toEqual(false)

    await app.click('[aria-label="Subscribe, $2.99 a month"]')
    await settle()

    expect(openPage).not.toHaveBeenCalled()
    expect(asked('/v1/checkout')).toEqual(false)
    expect(asked('/v1/portal')).toEqual(false)
    expect(storekit.calls).toContainEqual(['purchase', MONTHLY, 'acc_1'])
  })

  story('renews a lapsed subscription through the App Store too', async () => {
    await open({ refuse: LAPSED })

    expect(has('Renew')).toEqual(false)
    expect(has('Renew, $2.99 a month')).toEqual(true)

    await app.click('[aria-label="Renew, $2.99 a month"]')
    await settle()

    expect(app.text()).toContain('Your subscription is active.')
    expect(asked('/v1/checkout')).toEqual(false)
  })

  story('manages a subscription bought there through the App Store', async () => {
    await open()
    await app.click('[aria-label="Subscribe, $2.99 a month"]')
    await settle()

    await app.click('[aria-label="Manage subscription"]')
    await settle()

    expect(storekit.calls).toContainEqual(['manage'])
    expect(asked('/v1/portal')).toEqual(false)
  })

  test('says nothing when the reader closes the purchase sheet', async () => {
    storekit.answer = 'cancelled'
    await open()

    await app.click('[aria-label="Subscribe, $2.99 a month"]')
    await settle()

    expect(service.transactions).toEqual([])
    expect(app.text()).toContain('Your feeds are not syncing.')
    expect(has('Subscribe, $2.99 a month')).toEqual(true)
  })

  test('says a purchase is waiting when it needs approval', async () => {
    storekit.answer = 'pending'
    await open()

    await app.click('[aria-label="Subscribe, $2.99 a month"]')
    await settle()

    expect(app.text()).toContain('Your purchase is waiting for approval. Sync starts once it is approved.')
  })

  test('says what the service said when it refuses the purchase', async () => {
    service.apple = { status: 403, body: '{"error":"wrong_account"}' }
    await open()

    await app.click('[aria-label="Subscribe, $2.99 a month"]')
    await settle()

    expect(app.text()).toContain('That purchase belongs to a different account. Sign in with the email you subscribed with.')
    expect(app.text()).toContain('Your feeds are not syncing.')
  })

  describe('a subscription the Apple Account already holds', () => {
    // Bought on another device, or before the device was signed out.
    story('is restored: every entitlement goes to the service, and the log syncs', async () => {
      await open()
      storekit.owned.push('jws.acc_1.1', 'jws.acc_1.2')

      await app.click('[aria-label="Restore purchases"]')
      await settle()

      expect(service.transactions).toEqual(['jws.acc_1.1', 'jws.acc_1.2'])
      expect(app.text()).toContain('Your subscription is active.')
      expect(has('Restore purchases')).toEqual(false)
      expect(service.body()).toContain('https://foo.bar/rss.xml')
    })

    test('says when there is nothing to restore', async () => {
      await open()

      await app.click('[aria-label="Restore purchases"]')
      await settle()

      expect(storekit.calls).toContainEqual(['entitlements'])
      expect(app.text()).toContain('This Apple Account has no subscription to restore.')
      expect(has('Restore purchases')).toEqual(true)
    })

    // Before the first read of the account's log, so the service does not
    // answer the sign in with a 402.
    story('lets the first sync through when signing in', async () => {
      Object.assign(service, { refuse: NEVER_PAID, subscribed: false })
      storekit.owned.push('jws.acc_1.1')

      app = await mountApp({ hostedFetch: service.fetch, storekit, openPage, state: { abc123: { config: {}, data: SEED } } })
      await app.click('[aria-label="You"]')
      await app.find('[aria-label="Email"]').setValue(EMAIL)
      await app.click('[aria-label="Send code"]')
      await settle()
      await app.find('[aria-label="Code"]').setValue(service.code)
      await app.click('[aria-label="Sign in"]')
      await settle()

      expect(service.transactions).toEqual(['jws.acc_1.1'])
      expect(service.body()).toContain('https://foo.bar/rss.xml')
      expect(app.text()).toContain('Your subscription is active.')
      expect(app.text()).not.toContain('Your feeds are not syncing.')
    })
  })

  test('offers Subscribe without a price when the store sells nothing yet, and says so when asked', async () => {
    storekit.shelf = []
    await open()

    expect(has('Subscribe')).toEqual(true)

    await app.click('[aria-label="Subscribe"]')
    await settle()

    expect(app.text()).toContain('Subscriptions are not available right now. Try again later.')
    expect(asked('/v1/checkout')).toEqual(false)
  })
})
