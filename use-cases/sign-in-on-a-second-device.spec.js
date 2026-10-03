import { mountApp, describe, story, test, hostedService } from './helper.js'

const EMAIL = 'reader@example.com'

const FIRST = `
  0/identities/abc123/create/v2.1 {"name":"First device"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
`

// What a device holds before it signs in: an identity of its own, a feed the
// account already follows, and one it does not.
const SECOND = `
  0/identities/xyz789/create/v2.1 {"name":"Second device"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/feeds/901/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
  3/feeds/902/create/v2.1 {"url":"https://second.example/rss.xml","data":{"title":"Followed here"}}
  4/entries/e1/create/v2.1 {"feedId":"902","data":{"guid":"1","title":"An article"}}
`

const SAVED = '5/entries/e1/save/v2.1 {"at":5}'

describe('Sign in on a second device', () => {
  let service
  let app

  const settle = async () => {
    for (let i = 0; i < 8; i++) await app.wait()
  }

  // The first device signs in, puts its log up and is put away.
  const first = async () => {
    const one = await mountApp({ hostedFetch: service.fetch, state: { abc123: { config: {}, data: FIRST } } })

    await one.vm.commands.signInToAccount(one.vm.identity, { email: EMAIL, code: service.code })
    one.unmount()
  }

  const second = async (extra = '') => {
    app = await mountApp({ hostedFetch: service.fetch, state: { xyz789: { config: {}, data: `${SECOND}${extra}` } } })

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

  const feeds = () => app.vm.queries.feedsForIdentity(app.vm.identity).map((feed) => app.vm.queries.urlForFeed(feed)).sort()
  const identities = () => app.vm.queries.allIdentities().map((identity) => identity.id).sort()

  beforeEach(() => {
    service = hostedService()
  })

  afterEach(() => app.unmount())

  // The log's keys are written against the identity that made it, so events
  // imported under any other belong to nobody.
  story('reads the identity the account already holds', async () => {
    await first()
    await second()
    await signIn()

    expect(app.vm.identity.id).toEqual('abc123')
    expect(app.text()).toContain(`Signed in as ${EMAIL}.`)
    expect(feeds()).toContain('https://foo.bar/rss.xml')
  })

  story('brings along the feeds this device followed, once each', async () => {
    await first()
    await second()
    await signIn()

    expect(feeds()).toEqual(['https://foo.bar/rss.xml', 'https://second.example/rss.xml'])
  })

  story('puts them in the account for the other devices', async () => {
    await first()
    await second()
    await signIn()
    await app.vm.commands.syncIdentity(app.vm.identity)

    expect(service.body()).toContain('https://second.example/rss.xml')
    expect(service.body()).not.toContain('xyz789')
  })

  test('lets go of the identity it started with, when nothing else was in it', async () => {
    await first()
    await second()
    await signIn()

    expect(identities()).toEqual(['abc123'])
  })

  // Saving is the one place a reader says to keep something.
  test('keeps the identity it started with when something in it was saved', async () => {
    await first()
    await second(SAVED)
    await signIn()

    expect(app.vm.identity.id).toEqual('abc123')
    expect(identities()).toEqual(['abc123', 'xyz789'])
  })

  test('brings nothing along twice when it signs in again', async () => {
    await first()
    await second(SAVED)
    await signIn()
    await app.vm.commands.signOutOfAccount(app.vm.identity)

    app.vm.setIdentity(app.vm.queries.allIdentities().find((identity) => identity.id === 'xyz789'))
    await settle()
    await signIn()

    expect(app.vm.identity.id).toEqual('abc123')
    expect(feeds()).toEqual(['https://foo.bar/rss.xml', 'https://second.example/rss.xml'])
  })

  story('keeps its own identity when the account holds nothing yet', async () => {
    await second()
    await signIn()

    expect(app.vm.identity.id).toEqual('xyz789')
    expect(service.body()).toContain('https://second.example/rss.xml')
  })

  // An account that never paid was never written, and the service refuses
  // even the read.
  test('keeps its own identity when the account never paid, and says what to do', async () => {
    service.refuse = { status: 402, body: '{"error":"no_subscription"}' }

    await second()
    await signIn()

    expect(app.vm.identity.id).toEqual('xyz789')
    expect(app.text()).toContain(`Signed in as ${EMAIL}.`)
    expect(app.text()).toContain('Your feeds are not syncing. Subscribe to keep them on every device.')
  })

  // Whose log it holds cannot be read yet, so this device keeps its own
  // identity and the token, and takes the account over once it is paid
  // (use-cases/sign-in-to-a-lapsed-account.spec.js).
  test('signs in to an account that lapsed, and waits', async () => {
    await first()
    Object.assign(service, { refuse: { status: 402, body: '{"error":"subscription_expired"}' }, subscribed: false })

    await second()
    await signIn()

    expect(app.vm.identity.id).toEqual('xyz789')
    expect(app.vm.queries.accountForIdentity(app.vm.identity)).toMatchObject({ pending: 'subscription_expired' })
    expect(app.text()).toContain('Your subscription has lapsed. Renew it to sync again.')
  })
})
