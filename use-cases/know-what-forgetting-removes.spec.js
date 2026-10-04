import { mountApp, describe, story, s3Bucket, hostedService, vi } from './helper.js'

const EMAIL = 'reader@example.com'

const IDENTITY = (id, name, extra = '') => ({
  config: {},
  data: `
    0/identities/${id}/create/v2.1 {"name":"${name}"}
    1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
    2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
    ${extra}
  `
})

const BUCKET = '3/addons/777/configure/v2.1 {"type":"S3Adapter","data":{"bucket":"b","region":"r","accessKeyId":"a","secretAccessKey":"s"}}'

// Forgetting says which identity goes, what stays on this device and what
// becomes of the copy kept elsewhere, on the card and again when it asks.
describe('Know what forgetting removes', () => {
  let app
  let confirm
  let service

  const settle = async () => {
    for (let i = 0; i < 8; i++) await app.wait()
  }

  const open = async (state, options = {}) => {
    confirm = vi.fn().mockResolvedValue()
    app = await mountApp(Object.assign({ state, confirm }, options))

    await app.click('[aria-label="You"]')
  }

  const signIn = async () => {
    await app.vm.commands.signInToAccount(app.vm.identity, { email: EMAIL, code: service.code })
    await settle()
  }

  const card = () => app.find('[aria-label="Forget identity"]').text()

  const asked = async () => {
    await app.click('[aria-label="Forget identity"]')

    return confirm.mock.calls[confirm.mock.calls.length - 1][0]
  }

  const says = async (sentence) => {
    expect(card()).toContain(sentence)
    expect(await asked()).toContain(sentence)
  }

  beforeEach(() => {
    service = hostedService()
  })

  afterEach(() => app.unmount())

  story('names the identity it forgets, and says only that one goes', async () => {
    await open({ abc123: IDENTITY('abc123', 'Work') })

    expect(card()).toContain('Forget Work')
    expect(card()).toContain('Removes only this identity from this device.')
    expect(await asked()).toContain('Forget Work? This removes only this identity from this device.')
  })

  story('says a new identity takes the place of the only one', async () => {
    await open({ abc123: IDENTITY('abc123', 'Work') })
    await says('A new identity takes its place, following only the Changelog.')
  })

  story('says the other identity stays', async () => {
    await open({ abc123: IDENTITY('abc123', 'Work'), def456: IDENTITY('def456', 'Home') })
    await says('Your other identity stays.')
  })

  story('counts the other identities that stay', async () => {
    await open({ abc123: IDENTITY('abc123', 'Work'), def456: IDENTITY('def456', 'Home'), ghi789: IDENTITY('ghi789', 'Play') })
    await says('Your 2 other identities stay.')
  })

  story('says the only copy is gone for good with no backup', async () => {
    await open({ abc123: IDENTITY('abc123', 'Work') })
    await says('This device is the only copy. It is gone for good.')
  })

  story('says the copy in my own storage stays', async () => {
    await open({ abc123: IDENTITY('abc123', 'Work', BUCKET) }, { awsClient: s3Bucket().client })
    await says('The copy in your own storage stays. Nothing there is deleted.')
  })

  story('says the copy in my account stays', async () => {
    await open({ abc123: IDENTITY('abc123', 'Work') }, { hostedFetch: service.fetch })
    await signIn()
    await says('The copy in your account stays. Nothing there is deleted.')
  })

  story('says what an account that is not paid has not synced is gone', async () => {
    await open({ abc123: IDENTITY('abc123', 'Work') }, { hostedFetch: service.fetch })
    await signIn()

    Object.assign(service, { refuse: { status: 402, body: '{"error":"subscription_expired"}' }, subscribed: false })
    await app.vm.commands.syncIdentity(app.vm.identity).catch(() => {})
    await settle()

    await says('Your account is not paid. What it has not synced is gone for good.')
  })
})
