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

// The bucket answers a conditional read that matches through the error
// argument, which is the opposite of a failure.
const notModified = () => Object.assign(new Error('NotModified'), { statusCode: 304, code: 'NotModified' })

const seed = (extra = '', config = {}) => ({
  abc123: {
    config,
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
    putObject = vi.fn((params, cb) => cb(null, { ETag: '"written"' }))
    getObject = vi.fn((params, cb) => {
      return options.getError ? cb(options.getError, null) : cb(null, { Body: options.remote || '', ETag: options.etag || '"remote"' })
    })

    return mountApp({
      awsS3: () => Promise.resolve({ putObject, getObject }),
      state: seed(options.extra, options.config),
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

    // The whole point of reading first: what is already in the bucket has to
    // survive. A read that fails has to stop the write, or a device that
    // cannot see the copy overwrites it with its own.
    test('does not write over a copy it could not read', async () => {
      app = await mount()

      getObject = vi.fn((params, cb) => cb(new Error('AccessDenied'), null))
      putObject.mockClear()

      await app.click('[aria-label="Mark as read 6363"]')

      expect(putObject).not.toHaveBeenCalled()
      expect(app.vm.queries.syncStatusForIdentity(app.vm.identity).status).toEqual('failed')
    })

    test('does not duplicate events it already has', async () => {
      app = await mount({
        remote: '3/entries/6363/create/v2.1 {"feedId":"543","data":{"guid":"987","title":"Entry title"}}'
      })

      const titles = app.findAll('[aria-label="Entry title"]').map((el) => el.text())

      expect(titles.filter((t) => t === 'Entry title').length).toEqual(1)
    })
  })

  // The log is the whole corpus in one object, read on every boot and again
  // before every save. Downloading it to discover it has not changed is the
  // most expensive thing the app does.
  describe('when the bucket holds a copy this device has already read', () => {
    story('asks for anything but that copy', async () => {
      app = await mount({ config: { remoteEtag: '"held"' } })

      expect(getObject.mock.calls[0][0].IfNoneMatch).toEqual('"held"')
    })

    test('asks unconditionally when it has never read one', async () => {
      app = await mount()

      expect(getObject.mock.calls[0][0].IfNoneMatch).toBeUndefined()
    })

    test('does not fold a copy it is told it already holds', async () => {
      app = await mount({
        config: { remoteEtag: '"held"' },
        getError: notModified(),
        remote: '9/entries/7777/create/v2.1 {"feedId":"543","data":{"guid":"999","title":"From the bucket"}}'
      })

      const titles = app.findAll('[aria-label="Entry title"]').map((el) => el.text())

      expect(titles).not.toContain('From the bucket')
    })

    // Not the same case as an empty bucket, and nothing like a read that
    // failed: the copy is there, we have it, and the write must still happen.
    test('still writes its own events over it', async () => {
      app = await mount({ config: { remoteEtag: '"held"' }, getError: notModified() })

      putObject.mockClear()

      await app.click('[aria-label="Mark as read 6363"]')

      expect(putObject).toHaveBeenCalled()
      expect(app.vm.queries.syncStatusForIdentity(app.vm.identity).status).toEqual('saved')
    })

    test('remembers the copy it read, so the next read is conditional on it', async () => {
      app = await mount()

      await app.click('[aria-label="Mark as read 6363"]')

      expect(getObject.mock.calls[1][0].IfNoneMatch).toEqual('"remote"')
    })

    test('remembers the copy it wrote, rather than fetching it back to find out', async () => {
      app = await mount()

      await app.click('[aria-label="Mark as read 6363"]')
      await app.click('[aria-label="Mark as unread 6363"]')

      expect(getObject.mock.calls[2][0].IfNoneMatch).toEqual('"written"')
    })

    // It describes what this browser last saw in one bucket. Another device
    // reading it out of the log would skip a read it has never done.
    test('keeps the version it saw out of the log', async () => {
      app = await mount()

      await app.click('[aria-label="Mark as read 6363"]')

      expect(app.vm.queries.eventsToFile(app.vm.identity)).not.toContain('remoteEtag')
      expect(app.vm.state.getConfig('abc123').remoteEtag).toEqual('"written"')
    })
  })
})
