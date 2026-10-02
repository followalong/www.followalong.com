import { mountApp, describe, story, test, s3Bucket, hostedService } from './helper.js'

const SEED = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
`

const BUCKET = '3/addons/s3addon/configure/v2.1 {"type":"S3Adapter","data":{"bucket":"mine","region":"us-east-1","accessKeyId":"a","secretAccessKey":"s"}}'

describe('Choose where my feeds are kept', () => {
  let app
  let bucket
  let service

  const settle = async () => {
    for (let i = 0; i < 6; i++) await app.wait()
  }

  const open = async (extra = '') => {
    bucket = s3Bucket()
    service = hostedService()
    app = await mountApp({ awsClient: bucket.client, hostedFetch: service.fetch, state: { abc123: { config: {}, data: `${SEED}${extra}` } } })

    await app.click('[aria-label="You"]')
  }

  const has = (label) => app.find(`[aria-label="${label}"]`).exists()

  const toStorage = async () => {
    await app.click('[aria-label="Your own storage"]')
    await settle()
  }

  afterEach(() => app.unmount())

  describe('with nothing set up', () => {
    beforeEach(() => open())

    story('is offered an account first', () => {
      expect(has('Email')).toEqual(true)
      expect(has('Send code')).toEqual(true)
    })

    story('is pointed, quietly, at storage of its own', async () => {
      expect(app.text()).toContain('Want to manage your own storage?')

      await toStorage()

      expect(app.vm.$route.path).toEqual('/storage')
      expect(app.text()).toContain('Your own storage')
      expect(has('Configure S3Adapter')).toEqual(true)
      expect(has('Email')).toEqual(false)
    })

    story('connects a bucket there, and stays there', async () => {
      await toStorage()
      await app.click('[aria-label="Configure S3Adapter"]')

      for (const [field, value] of Object.entries({ bucket: 'mine', region: 'us-east-1', accessKeyId: 'a', secretAccessKey: 's' })) {
        await app.find(`[aria-label="Configure S3Adapter ${field}"]`).setValue(value)
      }

      await app.submit('[aria-label="Save S3Adapter"]')
      await settle()

      expect(app.vm.$route.path).toEqual('/storage')
      expect(bucket.body()).toContain('https://foo.bar/rss.xml')
      expect(has('Back up now')).toEqual(true)
    })
  })

  describe('on a device that syncs to a bucket', () => {
    beforeEach(() => open(BUCKET))

    // Never both hidden and syncing, and never two targets at once.
    story('sees one line and the way to its page, and no sign in', () => {
      expect(app.text()).toContain('This device syncs to your own storage.')
      expect(has('Your own storage')).toEqual(true)
      expect(has('Email')).toEqual(false)
    })

    story('finds the bucket, its status and the setup code on that page', async () => {
      await toStorage()
      await app.click('[aria-label="Back up now"]')
      await settle()

      expect(app.text()).toContain('Backed up')
      expect(has('Configure S3Adapter')).toEqual(true)

      await app.click('[aria-label="Show setup code"]')
      await settle()

      expect(app.find('[aria-label="Handoff link"]').element.value).toContain('#setup=')
    })

    story('disconnects there, and the bucket keeps what it holds', async () => {
      await toStorage()
      await app.click('[aria-label="Back up now"]')
      await settle()

      const held = bucket.body()

      await app.click('[aria-label="Disconnect"]')
      await settle()

      expect(app.vm.queries.syncStatusForIdentity(app.vm.identity).status).toEqual('off')
      expect(has('Disconnect')).toEqual(false)
      expect(bucket.body()).toEqual(held)
    })

    test('keeps the setup code off the You page', () => {
      expect(has('Show setup code')).toEqual(false)
    })
  })

  describe('on a device signed in to an account', () => {
    beforeEach(async () => {
      await open()
      await app.vm.commands.signInToAccount(app.vm.identity, { email: 'reader@example.com', code: service.code })
      await settle()
    })

    // A bucket's keys go into the log, and the service reads this log.
    story('is told to sign out before connecting storage of its own', async () => {
      await app.vm.$router.push('/storage')
      await settle()

      expect(app.text()).toContain('This device syncs to your account. Sign out before you connect your own storage')
      expect(has('Configure S3Adapter')).toEqual(false)
    })

    test('is not pointed at storage of its own', () => {
      expect(has('Your own storage')).toEqual(false)
    })
  })
})
