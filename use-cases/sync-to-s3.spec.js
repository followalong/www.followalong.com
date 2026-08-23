import { mountApp, describe, story, test, vi } from './helper.js'
import { decrypt } from '../src/queries/crypt.js'

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

const seed = (extra = '') => ({
  abc123: {
    config: {},
    data: `
      0/identities/abc123/create/v2.1
      1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
      2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
      3/entries/6363/create/v2.1 {"feedId":"543","data":{"guid":"987","title":"Entry title"}}
      4/addons/s3addon/configure/v2.1 ${ADDON}
      ${extra}
    `
  }
})

describe('Sync to S3', () => {
  let app
  let putObject
  let getObject

  const mount = (options = {}) => {
    putObject = vi.fn((params, cb) => cb(null, {}))
    getObject = vi.fn((params, cb) => cb(null, { Body: options.remote || '' }))

    return mountApp({
      awsS3: () => Promise.resolve({ putObject, getObject }),
      state: seed(options.extra),
      ...options
    })
  }

  describe('after a change', () => {
    beforeEach(async () => {
      app = await mount()

      putObject.mockClear()

      await app.click('[aria-label="Mark as read 6363"]')
    })

    story('pushes the event log to the configured bucket', () => {
      expect(putObject).toHaveBeenCalled()

      const params = putObject.mock.calls[0][0]

      expect(params.Bucket).toEqual('my-bucket')
      expect(params.Key).toEqual('identities/abc123.log')
    })

    test('sends the events themselves, one per line', () => {
      const body = putObject.mock.calls[0][0].Body

      expect(body).toContain('/entries/6363/markRead/')
      expect(body).toContain('/feeds/543/create/')
      expect(body.split('\n').length).toBeGreaterThan(1)
    })

    test('debounces so a burst of events is one upload', () => {
      expect(putObject).toHaveBeenCalledTimes(1)
    })
  })

  describe('when the identity has an encryption key', () => {
    beforeEach(async () => {
      app = await mount({ prompt: () => 'hunter2' })

      await app.vm.commands.keychain.addStore('abc123')

      putObject.mockClear()

      await app.click('[aria-label="Mark as read 6363"]')

      // Encrypting is asynchronous now, so wait for the upload itself rather
      // than for the debounce that schedules it.
      await app.vm.commands.syncIdentity(app.vm.identity)
    })

    story('never puts the plaintext log in the bucket', () => {
      const body = putObject.mock.calls[0][0].Body

      expect(body).not.toContain('/entries/6363/markRead/')
      expect(body).not.toContain('Feed title')
    })

    test('round-trips back to the same log', async () => {
      const body = putObject.mock.calls[0][0].Body

      expect(await decrypt('hunter2')(body)).toContain('/entries/6363/markRead/')
    })
  })

  describe('on load', () => {
    test('merges events it has never seen', async () => {
      app = await mount({
        remote: '9/entries/7777/create/v2.1 {"feedId":"543","data":{"guid":"999","title":"From the bucket"}}'
      })

      const titles = app.findAll('[aria-label="Entry title"]').map((el) => el.text())

      expect(titles).toContain('From the bucket')
    })

    test('does not let an older remote event undo a newer local one', async () => {
      // The entry was marked read locally at t=8. The bucket still holds a
      // markUnread from t=5, which must not win just by arriving later.
      app = await mount({
        extra: '8/entries/6363/markRead/v2.3 {}',
        remote: '5/entries/6363/markUnread/v2.3 {}'
      })

      expect(app.findAll('[aria-label="Mark as unread 6363"]').length).toEqual(1)
    })

    test('does not duplicate events it already has', async () => {
      app = await mount({
        remote: '3/entries/6363/create/v2.1 {"feedId":"543","data":{"guid":"987","title":"Entry title"}}'
      })

      const titles = app.findAll('[aria-label="Entry title"]').map((el) => el.text())

      expect(titles.filter((t) => t === 'Entry title').length).toEqual(1)
    })
  })
})
