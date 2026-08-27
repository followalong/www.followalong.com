import { mountApp, describe, story, s3Bucket, s3Response } from './helper.js'
import { decodeHandoff } from '../src/queries/handoff.js'

const IDENTITY = (data) => `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
  2/addons/777/configure/v2.1 {"type":"S3Adapter","data":${JSON.stringify(Object.assign({ bucket: 'b', region: 'r', accessKeyId: 'a', secretAccessKey: 's' }, data))}}
`

describe('Set up another device', () => {
  let app
  let bucket

  // One bucket, shared by both devices, keyed by the address the adapter
  // built: a device that reconstructs the wrong key — or the wrong host —
  // finds nothing there.
  const hosts = () => Array.from(new Set(bucket.requests.map((r) => new URL(r.url).host)))

  const link = () => app.find('[aria-label="Handoff link"]').element.value

  const firstDevice = async (addonData) => {
    bucket = s3Bucket()

    app = await mountApp({ state: { abc123: { config: {}, data: IDENTITY(addonData) } }, awsClient: bucket.client })

    await app.click('[aria-label="You"]')
    await app.click('[aria-label="Back up now"]')
    await app.click('[aria-label="Show setup code"]')
  }

  beforeEach(() => firstDevice())

  story('hands out a link back to the app', () => {
    expect(link()).toContain('#setup=')
  })

  story('carries the bucket, not the log', () => {
    expect(link()).not.toContain('feeds/543')
    expect(link().length).toBeLessThan(700)
  })

  // Every character is a denser code for a camera to read off a screen, so
  // anything the far end's own constructor supplies is left out.
  story('leaves out what the other device fills in for itself', () => {
    const payload = decodeHandoff(link())

    expect(payload.d.bucket).toEqual('b')
    expect(payload.d.key).toBeUndefined()
    expect(payload.d.endpoint).toBeUndefined()
  })

  story('shows it as a code to point a camera at', () => {
    expect(app.find('[aria-label="Setup code"]').exists()).toEqual(true)
  })

  story('says out loud what scanning it gives away', () => {
    expect(app.text()).toContain('Anyone who scans')
  })

  describe('On the second device', () => {
    let second

    const arrive = async () => {
      second = await mountApp({ handoffHash: `#${link().split('#')[1]}`, awsClient: bucket.client })

      await second.wait()
    }

    story('offers to set the device up', async () => {
      await arrive()

      expect(second.text()).toContain('Set up this device')
    })

    story('brings the identity over when accepted', async () => {
      await arrive()
      await second.click('[aria-label="Set it up"]')

      expect(second.vm.queries.allIdentities().map((i) => i.id)).toContain('abc123')
    })

    story('brings the feeds with it', async () => {
      await arrive()
      await second.click('[aria-label="Set it up"]')

      const arrived = second.vm.queries.allIdentities().find((i) => i.id === 'abc123')

      expect(second.vm.queries.feedsForIdentity(arrived)).toHaveLength(1)
    })

    story('is done with the code once it has been used', async () => {
      await arrive()
      await second.click('[aria-label="Set it up"]')

      expect(second.vm.handoff).toBeNull()
      expect(second.vm.$route.hash).toEqual('')
    })

    // Both devices have to land on the same object in the same bucket, and
    // the stub only answers the key it was written to.
    story('reads the same object the first device wrote', async () => {
      await arrive()
      await second.click('[aria-label="Set it up"]')

      expect(Object.keys(bucket.objects)).toEqual(['https://s3.us-east-1.amazonaws.com/b/identities/followalong.log'])
      expect(second.text()).not.toContain('NoSuchKey')
    })

    story('uses the endpoint the first device used', async () => {
      await arrive()
      await second.click('[aria-label="Set it up"]')

      expect(hosts()).toEqual(['s3.us-east-1.amazonaws.com'])
    })

    story('says so when the bucket cannot be read', async () => {
      const setup = link().split('#')[1]

      second = await mountApp({
        handoffHash: `#${setup}`,
        awsClient: s3Bucket({
          answer: () => s3Response({ status: 403, body: '<Error><Code>Access denied</Code></Error>' })
        }).client
      })

      await second.click('[aria-label="Set it up"]')
      await second.wait()

      expect(second.text()).toContain('Access denied')
    })
  })

  // A bucket that is not Amazon's, at a path of its own: nothing here is a
  // default, so all of it has to ride in the code.
  describe('With a key and endpoint of its own', () => {
    const OWN = { key: '/mine/followalong.log', endpoint: 'nyc3.digitaloceanspaces.com' }

    beforeEach(() => firstDevice(OWN))

    story('carries them in the code', () => {
      expect(decodeHandoff(link()).d).toMatchObject(OWN)
    })

    story('sets the second device up from them', async () => {
      const second = await mountApp({ handoffHash: `#${link().split('#')[1]}`, awsClient: bucket.client })

      await second.wait()
      await second.click('[aria-label="Set it up"]')

      expect(Object.keys(bucket.objects)).toEqual(['https://nyc3.digitaloceanspaces.com/b/mine/followalong.log'])
      expect(second.vm.queries.allIdentities().map((i) => i.id)).toContain('abc123')
      expect(hosts()).toEqual([OWN.endpoint])
    })
  })
})
