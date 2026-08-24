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

const FEED = '<feed><title>Feed title</title></feed>'

const seed = () => ({
  abc123: {
    config: {},
    data: `
      0/identities/abc123/create/v2.1
      1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
      2/feeds/one/create/v2.1 {"url":"http://one.example/rss.xml","data":{"title":"One"}}
      3/feeds/two/create/v2.1 {"url":"http://two.example/rss.xml","data":{"title":"Two"}}
      4/addons/s3addon/configure/v2.1 ${ADDON}
    `
  }
})

const callsFor = (fetch, host) => {
  return fetch.mock.calls.filter((call) => `${call[0]}`.indexOf(host) !== -1).length
}

describe('Poll feeds once at a time', () => {
  let app
  let fetch
  let answer

  beforeEach(async () => {
    // The first feed is left hanging, so the sweep is still working through
    // the list when the bucket answers.
    fetch = vi.fn((url) => {
      return `${url}`.indexOf('one.example') !== -1
        ? new Promise(() => {})
        : Promise.resolve({ status: 200, body: FEED })
    })

    app = await mountApp({
      fetch,
      automaticFetch: true,
      state: seed(),
      awsS3: () => Promise.resolve({
        putObject: vi.fn((params, cb) => cb(null, {})),
        getObject: vi.fn((params, cb) => { answer = cb })
      })
    })

    // The sweep is scheduled off a timer and works through the feeds in
    // series, so it takes a few turns to reach the first one.
    for (let i = 0; i < 10; i++) await app.wait()
  })

  // The copy landing re-points the identity, and every feed the running sweep
  // has not reached yet still looks outdated, so a second sweep asks for all
  // of them again.
  story('does not start a second sweep while one is running', async () => {
    expect(callsFor(fetch, 'one.example')).toEqual(1)

    answer(null, { Body: '5/feeds/three/create/v2.1 {"url":"http://three.example/rss.xml","data":{"title":"Three"}}' })
    for (let i = 0; i < 10; i++) await app.wait()

    expect(callsFor(fetch, 'one.example')).toEqual(1)
  })
})
