import { mountApp, describe, story } from './helper.js'

const IDENTITY = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
  2/addons/777/configure/v2.1 {"type":"S3Adapter","data":{"bucket":"b","region":"r","accessKeyId":"a","secretAccessKey":"s"}}
`

describe('Set up another device', () => {
  let app
  let bucket

  // One bucket, shared by both devices: whatever the first backs up is what
  // the second reads.
  const awsS3 = () => Promise.resolve({
    putObject: (params, cb) => { bucket = `${params.Body}`; cb(null) },
    getObject: (params, cb) => bucket ? cb(null, { Body: bucket }) : cb(new Error('NoSuchKey'))
  })

  const link = () => app.find('[aria-label="Handoff link"]').element.value

  beforeEach(async () => {
    bucket = null

    app = await mountApp({ state: { abc123: { config: {}, data: IDENTITY } }, awsS3 })

    await app.click('[aria-label="You"]')
    await app.click('[aria-label="Back up now"]')
    await app.click('[aria-label="Show setup code"]')
  })

  story('hands out a link back to the app', () => {
    expect(link()).toContain('#setup=')
  })

  story('carries the bucket, not the log', () => {
    expect(link()).not.toContain('feeds/543')
    expect(link().length).toBeLessThan(700)
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
      second = await mountApp({ handoffHash: `#${link().split('#')[1]}`, awsS3 })

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

    story('says so when the bucket cannot be read', async () => {
      const setup = link().split('#')[1]

      second = await mountApp({
        handoffHash: `#${setup}`,
        awsS3: () => Promise.resolve({
          putObject: (params, cb) => cb(new Error('nope')),
          getObject: (params, cb) => cb(new Error('Access denied'))
        })
      })

      await second.click('[aria-label="Set it up"]')

      expect(second.text()).toContain('Access denied')
    })
  })
})
