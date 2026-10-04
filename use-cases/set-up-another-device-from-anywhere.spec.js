import { mountApp, describe, story, s3Bucket, hostedService, vi } from './helper.js'

const EMAIL = 'reader@example.com'

const IDENTITY = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
`

const BUCKET = '3/addons/777/configure/v2.1 {"type":"S3Adapter","data":{"bucket":"b","region":"r","accessKeyId":"a","secretAccessKey":"s"}}'

// The way to another device is on the You page however this device keeps its
// feeds, and it says what to do in each case.
describe('Set up another device from anywhere', () => {
  let app
  let service

  const settle = async () => {
    for (let i = 0; i < 8; i++) await app.wait()
  }

  const open = async (options = {}, extra = '') => {
    app = await mountApp(Object.assign({ state: { abc123: { config: {}, data: `${IDENTITY}${extra}` } } }, options))

    await app.click('[aria-label="You"]')
  }

  const signIn = async () => {
    await app.vm.commands.signInToAccount(app.vm.identity, { email: EMAIL, code: service.code })
    await settle()
  }

  const ask = () => app.click('[aria-label="Another device"]')
  const sheet = () => app.find('[role="dialog"][aria-label="Set up another device"]')
  const has = (label) => sheet().find(`[aria-label="${label}"]`).exists()

  beforeEach(() => {
    service = hostedService()
  })

  afterEach(() => app.unmount())

  describe('With my own storage', () => {
    beforeEach(async () => {
      await open({ awsClient: s3Bucket().client }, BUCKET)
      await ask()
    })

    story('shows a code to point a camera at', () => {
      expect(has('Setup code')).toEqual(true)
      expect(sheet().find('[aria-label="Handoff link"]').element.value).toContain('#setup=')
    })

    story('says out loud what scanning it gives away', () => {
      expect(sheet().text()).toContain('Anyone who scans')
    })
  })

  describe('Signed in to my account', () => {
    beforeEach(async () => {
      await open({ hostedFetch: service.fetch })
      await signIn()
      await ask()
    })

    story('says to sign in on the other device with the same email', () => {
      expect(sheet().text()).toContain(`Sign in on the other device with ${EMAIL}. It picks up these feeds.`)
    })

    story('shows no code and no secret', () => {
      expect(has('Setup code')).toEqual(false)
      expect(has('Handoff link')).toEqual(false)
      expect(sheet().text()).not.toContain('tok_')
    })
  })

  describe('Signed in to an account that is not paid', () => {
    beforeEach(async () => {
      await open({ hostedFetch: service.fetch })
      await signIn()

      Object.assign(service, { refuse: { status: 402, body: '{"error":"subscription_expired"}' }, subscribed: false })
      await app.vm.commands.syncIdentity(app.vm.identity).catch(() => {})
      await settle()
      await ask()
    })

    story('says the other device can sign in once the account is paid', () => {
      expect(sheet().text()).toContain(`The other device can sign in with ${EMAIL} once this account is paid.`)
      expect(sheet().text()).not.toContain('It picks up these feeds')
    })

    story('shows no code', () => {
      expect(has('Setup code')).toEqual(false)
    })
  })

  describe('With no backup', () => {
    beforeEach(async () => {
      await open()
      await ask()
    })

    story('says this device is the only copy', () => {
      expect(sheet().text()).toContain('This device is the only copy of your feeds.')
    })

    story('shows no code', () => {
      expect(has('Setup code')).toEqual(false)
    })

    story('takes me to the sign in', async () => {
      const focus = vi.spyOn(app.find('input[aria-label="Email"]').element, 'focus')

      await app.click('[aria-label="Sign in on this device"]')

      expect(sheet().exists()).toEqual(false)
      expect(focus).toHaveBeenCalled()
    })

    story('takes me to my own storage', async () => {
      await app.click('[aria-label="Connect your own storage"]')

      expect(app.vm.$route.path).toEqual('/storage')
    })

    story('names the copy and paste way quietly', () => {
      expect(sheet().text()).toContain('Copy this identity')
      expect(sheet().text()).toContain('Paste an identity')
    })
  })
})
