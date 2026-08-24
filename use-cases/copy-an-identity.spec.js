import { mountApp, describe, story, vi } from './helper.js'

const seed = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/addons/777/configure/v2.1 {"type":"CORSAnywhere","data":{"url":"https://proxy.example/"}}
  3/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
  4/entries/keep/create/v2.1 {"feedId":"543","data":{"guid":"1","title":"Kept entry"}}
  5/entries/drop/create/v2.1 {"feedId":"543","data":{"guid":"2","title":"Ordinary entry"}}
  6/entries/keep/save/v2.1
`

const S3 = JSON.stringify({
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

describe('Copy an identity that backs up', () => {
  let app
  let copyToClipboard

  beforeEach(async () => {
    copyToClipboard = vi.fn()

    app = await mountApp({
      copyToClipboard,
      awsS3: () => Promise.resolve({ getObject: (params, cb) => cb(null, { Body: '' }) }),
      state: { abc123: { config: {}, data: `${seed}\n  7/addons/s3addon/configure/v2.1 ${S3}` } }
    })

    await app.click('[aria-label="You"]')
    await app.click('[aria-label="Copy identity"]')
  })

  story('says the copy carries the keys to the backup before it happens', () => {
    expect(copyToClipboard).not.toHaveBeenCalled()
    expect(app.text()).toContain('my-bucket')
    expect(app.text()).toContain('clipboard')
  })

  story('copies once that is understood, keys and all', async () => {
    await app.click('[aria-label="Copy it"]')

    expect(copyToClipboard.mock.calls[0][0]).toContain('AKIAEXAMPLE')
  })
})

describe('Copy an identity', () => {
  let app
  let copyToClipboard

  const copied = () => copyToClipboard.mock.calls[copyToClipboard.mock.calls.length - 1][0]

  beforeEach(async () => {
    copyToClipboard = vi.fn()

    app = await mountApp({
      copyToClipboard,
      state: { abc123: { config: {}, data: seed } }
    })

    await app.click('[aria-label="You"]')
    await app.click('[aria-label="Copy identity"]')
  })

  story('brings the identity, its feeds, signals and add-ons', () => {
    expect(copied()).toContain('identities/abc123/create')
    expect(copied()).toContain('feeds/543/create')
    expect(copied()).toContain('signals/134/create')
    expect(copied()).toContain('addons/777/configure')
  })

  story('brings the entries that were saved', () => {
    expect(copied()).toContain('entries/keep/create')
    expect(copied()).toContain('entries/keep/save')
  })

  story('leaves the rest of the entries behind', () => {
    expect(copied()).not.toContain('entries/drop')
  })

  // A roll up folds the entries into one event, where the filter above cannot
  // see them one at a time.
  story('leaves the rest of the entries behind after a roll up', async () => {
    await app.click('[aria-label="Roll up identity"]')
    await app.click('[aria-label="You"]')
    await app.click('[aria-label="Copy identity"]')

    expect(copied()).toContain('Kept entry')
    expect(copied()).not.toContain('Ordinary entry')
  })
})
