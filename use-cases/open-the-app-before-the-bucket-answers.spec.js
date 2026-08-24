import { mountApp, describe, story, vi } from './helper.js'

const ADDON = JSON.stringify({
  type: 'S3Adapter',
  data: {
    bucket: 'my-bucket',
    key: '/identities/abc123.log',
    region: 'us-east-1',
    endpoint: 's3.us-east-1.amazonaws.com',
    accessKeyId: 'AKIAEXAMPLE',
    secretAccessKey: 'secret'
  }
})

const seed = () => ({
  abc123: {
    config: {},
    data: `
      0/identities/abc123/create/v2.1
      1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
      2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed on this device"}}
      3/addons/s3addon/configure/v2.1 ${ADDON}
    `
  }
})

describe('Open the app before the bucket answers', () => {
  let app
  let answer

  beforeEach(async () => {
    // The bucket is left hanging, which is what a slow connection looks like
    // from the device: the copy is on the way and has not arrived.
    const getObject = vi.fn((params, cb) => { answer = cb })

    app = await mountApp({
      path: '/following',
      state: seed(),
      awsS3: () => Promise.resolve({ putObject: vi.fn((params, cb) => cb(null, {})), getObject })
    })
  })

  // Everything is already on the device. Waiting on the network to confirm it
  // buys nothing and costs the whole load.
  story('shows what this device already holds', () => {
    expect(app.text()).toContain('Feed on this device')
  })

  story('takes the copy from the bucket once it arrives', async () => {
    answer(null, { Body: '4/feeds/544/create/v2.1 {"url":"https://baz.qux/rss.xml","data":{"title":"Feed from the bucket"}}' })
    await app.wait()

    expect(app.text()).toContain('Feed from the bucket')
    expect(app.text()).toContain('Feed on this device')
  })
})
