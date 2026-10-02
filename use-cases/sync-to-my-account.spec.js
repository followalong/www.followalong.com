import { flushPromises } from '@vue/test-utils'
import { mountApp, describe, story, test, hostedService, vi } from './helper.js'

const EMAIL = 'reader@example.com'

const SEED = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
  3/entries/6363/create/v2.1 {"feedId":"543","data":{"guid":"987","title":"Entry title"}}
`

const BUCKET = '4/addons/s3addon/configure/v2.1 {"type":"S3Adapter","data":{"bucket":"b","region":"r","accessKeyId":"a","secretAccessKey":"s"}}'

describe('Sync to my account', () => {
  let app
  let service

  // A sign in is a dozen promises long, and one turn of the helper is one.
  const settle = async () => {
    for (let i = 0; i < 6; i++) await app.wait()
  }

  const open = async (options = {}) => {
    app = await mountApp({ hostedFetch: service.fetch, state: { abc123: { config: {}, data: `${SEED}${options.extra || ''}` } }, ...options })

    await app.click('[aria-label="You"]')
  }

  const askForCode = async (email = EMAIL) => {
    await app.find('[aria-label="Email"]').setValue(email)
    await app.click('[aria-label="Send code"]')
    await settle()
  }

  const signIn = async (code = service.code) => {
    await askForCode()
    await app.find('[aria-label="Code"]').setValue(code)
    await app.click('[aria-label="Sign in"]')
    await settle()
  }

  const sync = () => app.vm.commands.syncIdentity(app.vm.identity)
  const status = () => app.vm.queries.syncStatusForIdentity(app.vm.identity)
  const follow = (url) => app.vm.commands.track(app.vm.identity, 'feeds', null, 'create', { url, data: { title: url } })

  beforeEach(() => {
    service = hostedService()
  })

  afterEach(() => app.unmount())

  story('signs in with the code from an email, and the feeds go up', async () => {
    await open()
    await signIn()

    expect(app.text()).toContain(`Signed in as ${EMAIL}.`)
    expect(service.body()).toContain('https://foo.bar/rss.xml')
    expect(status().status).toEqual('saved')
  })

  test('mails the code to the address typed', async () => {
    await open()
    await askForCode()

    expect(service.requests.map((request) => [request.path, request.body])).toEqual([['/v1/signin/codes', `{"email":"${EMAIL}"}`]])
    expect(app.find('[aria-label="Code"]').exists()).toEqual(true)
  })

  test('says so when the address is not one', async () => {
    await open()
    await askForCode('nobody')

    expect(app.text()).toContain('That does not look like an email address.')
  })

  test('says a wrong code is wrong, and stays signed out', async () => {
    await open()
    await signIn('000000')

    expect(app.text()).toContain('That code is not right. Ask for a new one and try again.')
    expect(app.vm.queries.accountForIdentity(app.vm.identity)).toEqual(null)
  })

  story('keeps what changes after that in the account', async () => {
    await open()
    await signIn()

    follow('https://later.example/rss.xml')
    await sync()

    expect(service.body()).toContain('later.example')
  })

  story('stays signed in when the app starts again', async () => {
    await open()
    await signIn()

    const store = app.vm.state

    app.unmount()
    app = await mountApp({ hostedFetch: service.fetch, store })
    await app.click('[aria-label="You"]')

    expect(app.text()).toContain(`Signed in as ${EMAIL}.`)

    follow('https://after-restart.example/rss.xml')
    await sync()

    expect(service.body()).toContain('after-restart.example')
  })

  story('stops when signed out, and keeps the feeds here', async () => {
    await open()
    await signIn()
    await app.click('[aria-label="Sign out"]')
    await settle()

    service.requests.length = 0
    follow('https://signed-out.example/rss.xml')
    await sync()

    expect(service.requests).toEqual([])
    expect(app.find('[aria-label="Email"]').exists()).toEqual(true)
    expect(app.vm.queries.feedsForIdentity(app.vm.identity).length).toEqual(2)
  })

  // One account, one token per device. The log is what every device and the
  // service read.
  test('keeps the token, the address and the account out of the log', async () => {
    await open()
    await signIn()

    const log = app.vm.queries.eventsToFile(app.vm.identity)

    expect(log).not.toContain('tok_')
    expect(log).not.toContain(EMAIL)
    expect(log).not.toContain('acc_1')
    expect(service.body()).not.toContain('tok_')
  })

  // The service reads what it holds, so the identity's password has nothing
  // to protect there and the row would promise otherwise.
  test('offers no backup password while signed in', async () => {
    await open()

    expect(app.find('[aria-label="Change encryption"]').exists()).toEqual(true)

    await signIn()

    expect(app.find('[aria-label="Change encryption"]').exists()).toEqual(false)
  })

  describe('when the service refuses', () => {
    beforeEach(async () => {
      await open()
      await signIn()
    })

    const refused = async (refusal) => {
      service.refuse = refusal
      follow('https://refused.example/rss.xml')
      await sync()
      await settle()
    }

    story('signs the device out when its token is dead, and says so', async () => {
      await refused({ status: 401, body: '{"error":"unauthorized"}' })

      expect(app.vm.queries.accountForIdentity(app.vm.identity)).toEqual(null)
      expect(app.text()).toContain('This device was signed out. Sign in again to keep syncing.')
      expect(app.find('[aria-label="Email"]').exists()).toEqual(true)
    })

    test('says a subscription lapsed', async () => {
      await refused({ status: 402, body: '{"error":"subscription_expired"}' })

      expect(status()).toMatchObject({ status: 'failed', reason: 'subscription_expired', error: 'Your subscription has lapsed. Renew it to sync again.' })
      expect(app.text()).toContain('Your subscription has lapsed. Renew it to sync again.')
    })

    test('says an account is closed, which is not the same thing', async () => {
      await refused({ status: 402, body: '{"error":"account_cancelled"}' })

      expect(status()).toMatchObject({ status: 'failed', reason: 'account_cancelled', error: 'This account is closed, so syncing has stopped.' })
    })

    test('says the account is out of space', async () => {
      await refused({ status: 413, body: '{"error":"quota_exceeded"}' })

      expect(status().error).toEqual('This account is out of space. Your feeds stay on this device.')
    })

    test('says when to try again after too many requests', async () => {
      await refused({ status: 429, body: '{"error":"too_many_requests"}', headers: { 'retry-after': '45' } })

      expect(status().error).toEqual('Too many requests. Try again in 45 seconds.')
    })

    test('clears the reason once a sync lands', async () => {
      await refused({ status: 402, body: '{"error":"subscription_expired"}' })

      service.refuse = null
      await sync()

      expect(status()).toMatchObject({ status: 'saved', reason: '', error: '' })
    })

    // The bucket's fallback for storage that cannot take a condition. This
    // service always can, and refuses a write without one.
    test('says it could not reach the service, and never writes without a condition', async () => {
      service.offline = true
      follow('https://offline.example/rss.xml')
      await sync()

      expect(status().error).toContain('Could not reach the sync service. Check your connection.')

      service.offline = false
      service.requests.length = 0
      await sync()

      const writes = service.logs().filter((request) => request.method === 'PUT')

      expect(writes.length).toEqual(1)
      expect(writes[0].headers['if-match']).toBeTruthy()
      expect(service.body()).toContain('offline.example')
    })

    // A refusal with a reason is not one the next minute changes.
    test('stops asking on the clock while refused, and still asks when the window is focused', async () => {
      await refused({ status: 402, body: '{"error":"subscription_expired"}' })

      app.vm.commands.pullEveryMs = 60000

      // Promises only: the helper's wait runs every timer, and a clock never
      // runs out of them.
      const turn = async () => { for (let i = 0; i < 20; i++) await flushPromises() }
      const stop = app.vm.commands.pullWhileOpen(() => app.vm.identity)

      service.requests.length = 0
      vi.advanceTimersByTime(60000)
      await turn()

      const asked = service.requests.length

      window.dispatchEvent(new Event('focus'))
      await turn()
      stop()

      expect(asked).toEqual(0)
      expect(service.logs().length).toBeGreaterThan(0)
    })
  })

  // A bucket's keys are in the log that configured it, and the service can
  // read an account's log.
  describe('when the log holds the keys to a bucket', () => {
    const removeBucket = () => app.vm.commands.removeAddonFromIdentity(app.vm.identity, { id: 's3addon' })

    test('offers no sign in while the bucket is in use', async () => {
      await open({ extra: BUCKET })

      expect(app.find('[aria-label="Email"]').exists()).toEqual(false)
    })

    test('refuses to sign in after the bucket is removed, because the keys are still written down', async () => {
      await open({ extra: BUCKET })
      removeBucket()
      await settle()
      await askForCode()

      expect(app.text()).toContain('holds the keys to your own storage')
      expect(service.requests).toEqual([])
    })

    story('signs in once the identity is rolled up without them', async () => {
      await open({ extra: BUCKET })
      removeBucket()
      await app.vm.commands.createProjectionForIdentity(app.vm.identity)
      await settle()
      await app.click('[aria-label="You"]')
      await signIn()

      expect(app.text()).toContain(`Signed in as ${EMAIL}.`)
      expect(service.body()).not.toContain('secretAccessKey')
    })
  })
})
