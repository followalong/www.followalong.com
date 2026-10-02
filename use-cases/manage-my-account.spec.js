import { flushPromises } from '@vue/test-utils'
import { mountApp, describe, story, test, hostedService, vi } from './helper.js'

const EMAIL = 'reader@example.com'

const SEED = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
`

const NEVER_PAID = { status: 402, body: '{"error":"no_subscription"}' }
const LAPSED = { status: 402, body: '{"error":"subscription_expired"}' }
const CLOSED = { status: 402, body: '{"error":"account_cancelled"}' }

describe('Manage my account', () => {
  let app
  let service
  let openPage
  let confirm

  const settle = async () => {
    for (let i = 0; i < 8; i++) await app.wait()
  }

  // Signed in, on the You page. An account that never paid can still be
  // signed in to; one that stopped paying did so after this device signed in.
  const open = async ({ refuse = null, subscribed = true } = {}) => {
    app = await mountApp({ hostedFetch: service.fetch, openPage, confirm, state: { abc123: { config: {}, data: SEED } } })

    if (refuse === NEVER_PAID) Object.assign(service, { refuse, subscribed })

    await app.vm.commands.signInToAccount(app.vm.identity, { email: EMAIL, code: service.code })

    Object.assign(service, { refuse, subscribed })

    await app.vm.commands.syncIdentity(app.vm.identity)
    await app.click('[aria-label="You"]')
    await settle()
  }

  const has = (label) => app.find(`[aria-label="${label}"]`).exists()

  beforeEach(() => {
    service = hostedService()
    openPage = vi.fn(() => true)
    confirm = vi.fn().mockResolvedValue()
  })

  afterEach(() => app.unmount())

  story('says the subscription is active, and offers nothing to buy', async () => {
    await open()

    expect(app.text()).toContain('Your subscription is active.')
    expect(has('Subscribe')).toEqual(false)
    expect(has('Renew')).toEqual(false)
  })

  describe('never paid', () => {
    beforeEach(() => open({ refuse: NEVER_PAID, subscribed: false }))

    // Not a failure: it has not started.
    story('says the feeds are not syncing yet, and not that a backup failed', () => {
      expect(app.text()).toContain('Your feeds are not syncing. Subscribe to keep them on every device.')
      expect(app.text()).not.toContain('Backup failed')
    })

    story('opens the checkout', async () => {
      await app.click('[aria-label="Subscribe"]')
      await settle()

      expect(openPage).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_1')
    })

    // The webhook reaches the service a few seconds after the reader pays,
    // and the reader may already be looking at the app again.
    // Promises only, then the clock by hand: the helper's wait runs every
    // timer at once, which is the whole quarter of an hour of asking.
    story('starts syncing once the checkout is paid', async () => {
      const turn = async () => { for (let i = 0; i < 20; i++) await flushPromises() }

      await app.find('[aria-label="Subscribe"]').trigger('click')
      await turn()

      Object.assign(service, { refuse: null, subscribed: true })
      vi.advanceTimersByTime(5000)
      await turn()

      expect(app.text()).toContain('Your subscription is active.')
      expect(service.body()).toContain('https://foo.bar/rss.xml')
    })

    test('says so when the browser would not open the page', async () => {
      openPage.mockReturnValue(false)

      await app.click('[aria-label="Subscribe"]')
      await settle()

      expect(app.text()).toContain('We could not open the checkout page. Allow pop-ups for this site and try again.')
    })

    test('says what the service said when it cannot sell', async () => {
      service.subscribed = true

      await app.click('[aria-label="Subscribe"]')
      await settle()

      expect(app.text()).toContain('This account already has a subscription.')
      expect(openPage).not.toHaveBeenCalled()
    })

    test('has no billing to manage', () => {
      expect(has('Manage subscription')).toEqual(false)
    })
  })

  // Two refusals with one status, and they want opposite acts.
  story('offers a renewal for a subscription that lapsed', async () => {
    await open({ refuse: LAPSED, subscribed: false })

    expect(has('Renew')).toEqual(true)
    expect(has('Subscribe')).toEqual(false)

    await app.click('[aria-label="Renew"]')
    await settle()

    expect(openPage).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_1')
  })

  story('offers nothing to buy for an account that was closed', async () => {
    await open({ refuse: CLOSED, subscribed: false })

    expect(app.text()).toContain('This account is closed, so syncing has stopped.')
    expect(has('Renew')).toEqual(false)
    expect(has('Subscribe')).toEqual(false)
  })

  describe('billing', () => {
    story('opens the billing page for a subscription bought there', async () => {
      await open()
      await app.click('[aria-label="Manage subscription"]')
      await settle()

      expect(openPage).toHaveBeenCalledWith('https://billing.stripe.com/p/session/ps_1')
    })

    test('says what the service said when it cannot open one', async () => {
      await open()
      service.portal = { status: 502, body: '{"error":"portal_failed"}' }

      await app.click('[aria-label="Manage subscription"]')
      await settle()

      expect(app.text()).toContain('We could not open your billing page. Try again in a minute.')
    })

    test('is not offered for an account nobody billed', async () => {
      service.source = 'manual'
      await open()

      expect(has('Manage subscription')).toEqual(false)
    })
  })

  describe('deleting the account', () => {
    story('erases it, signs the device out and keeps the feeds here', async () => {
      await open()
      await app.click('[aria-label="Delete account"]')
      await settle()

      expect(confirm.mock.calls.pop()[0]).toContain('This cannot be undone.')
      expect(service.accounts.size).toEqual(0)
      expect(app.text()).toContain('Your account was deleted. Your feeds stay on this device.')
      expect(has('Email')).toEqual(true)
      expect(app.vm.queries.feedsForIdentity(app.vm.identity).length).toEqual(1)
    })

    test('does nothing when the reader thinks better of it', async () => {
      await open()
      confirm.mockRejectedValue(new Error('Not confirmed'))

      await app.click('[aria-label="Delete account"]')
      await settle()

      expect(service.accounts.size).toEqual(1)
      expect(app.text()).toContain(`Signed in as ${EMAIL}.`)
    })

    test('stays signed in when the service could not delete, and says nothing was removed', async () => {
      await open()
      service.remove = { status: 502, body: '{"error":"delete_failed"}' }

      await app.click('[aria-label="Delete account"]')
      await settle()

      expect(app.text()).toContain('We could not delete your account. Nothing was removed. Try again in a minute.')
      expect(app.text()).toContain(`Signed in as ${EMAIL}.`)
    })
  })
})
