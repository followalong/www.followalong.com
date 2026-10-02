import { mountApp, describe, story, test, s3Bucket, s3Response } from './helper.js'

const ADDON = JSON.stringify({
  type: 'S3Adapter',
  data: {
    bucket: 'shared',
    key: '/identities/followalong.log',
    region: 'us-east-1',
    endpoint: 's3.us-east-1.amazonaws.com',
    accessKeyId: 'AKIAEXAMPLE',
    secretAccessKey: 'secret'
  }
})

// One bucket, two devices. `afterRead` lets a spec act between a read and the
// write that follows it; `cannot` is storage with no conditional writes ('cors'
// or a status); `offline` loses every write.
const bucket = () => {
  const shared = s3Bucket()

  const write = (request) => {
    const conditional = request.headers['if-match'] || request.headers['if-none-match']

    if (shared.offline || (conditional && shared.cannot === 'cors')) return Promise.reject(new TypeError('Failed to fetch'))
    if (conditional && shared.cannot) return s3Response({ status: shared.cannot, body: '<Error><Code>NotImplemented</Code></Error>' })

    return shared.store(request)
  }

  shared.answer = (request) => {
    if (shared.unreadable) {
      return s3Response({ status: 403, body: '<Error><Code>Access denied</Code></Error>' })
    }

    if (request.method === 'PUT') return write(request)

    const response = shared.read(request)

    return Promise.resolve(shared.afterRead && shared.afterRead()).then(() => response)
  }

  return shared
}

const sync = (app) => app.vm.commands.syncIdentity(app.vm.identity)

const follow = (app, url) => app.vm.commands.track(app.vm.identity, 'feeds', null, 'create', { url, data: { title: url } })

const device = (id, shared, feedUrl) => mountApp({
  awsClient: shared.client,
  state: {
    [id]: {
      config: {},
      data: `
        0/identities/${id}/create/v2.1 {"name":"${id}"}
        1/addons/s3addon/configure/v2.1 ${ADDON}
        2/feeds/${id}-feed/create/v2.1 {"url":"${feedUrl}","data":{"title":"${id} feed"}}
      `
    }
  }
})

describe('Sync two devices through one bucket', () => {
  let shared
  let one
  let two

  beforeEach(async () => {
    shared = bucket()
    one = await device('deviceone', shared, 'https://one.example/rss.xml')
    two = await device('devicetwo', shared, 'https://two.example/rss.xml')
  })

  story('keeps the first device when the second writes', async () => {
    await one.vm.commands.syncIdentity(one.vm.identity)
    await two.vm.commands.syncIdentity(two.vm.identity)

    expect(shared.body()).toContain('deviceone')
    expect(shared.body()).toContain('devicetwo')
  })

  story('brings the other device down on the next sync', async () => {
    await one.vm.commands.syncIdentity(one.vm.identity)
    await two.vm.commands.syncIdentity(two.vm.identity)
    await one.vm.commands.syncIdentity(one.vm.identity)

    const feeds = one.vm.queries.feedsForIdentity(one.vm.identity)
      .map((feed) => one.vm.queries.urlForFeed(feed))

    expect(feeds).toContain('https://two.example/rss.xml')
  })

  story('writes on the very first sync, when the bucket is empty', async () => {
    await one.vm.commands.syncIdentity(one.vm.identity)

    expect(shared.writes().length).toEqual(1)
    expect(shared.body()).toContain('deviceone')
  })

  story('refuses to overwrite a copy it could not read', async () => {
    await one.vm.commands.syncIdentity(one.vm.identity)

    const before = shared.body()

    shared.unreadable = true

    const status = await two.vm.commands.syncIdentity(two.vm.identity)

    expect(status.status).toEqual('failed')
    expect(shared.body()).toEqual(before)
  })

  // Reading first only narrows the window: two devices that read the same
  // copy both write, and the later write is built from before the earlier one
  // landed. So the write names the copy it was built on.
  describe('writing on a condition', () => {
    const conditions = () => shared.writes().map((request) => request.headers)

    // The other device writes between this one's read and its write.
    const race = (write) => {
      shared.afterRead = () => {
        shared.afterRead = null

        return write()
      }
    }

    const pair = async () => {
      await sync(one)
      await sync(two)
      await sync(one)
    }

    story('writes over the copy it read and no other', async () => {
      await sync(one)

      follow(one, 'https://more.example/rss.xml')

      await sync(one)

      expect(conditions()).toEqual([{ 'if-none-match': '*' }, { 'if-match': '"v1"' }])
    })

    story('merges a copy that landed between its read and its write, in the same run', async () => {
      await pair()

      follow(one, 'https://from-one.example/rss.xml')
      follow(two, 'https://from-two.example/rss.xml')

      race(() => sync(two))

      const status = await sync(one)

      expect(status.status).toEqual('saved')
      expect(shared.body()).toContain('from-one.example')
      expect(shared.body()).toContain('from-two.example')
    })

    test('merges a first upload that raced another first upload', async () => {
      race(() => sync(two))

      await sync(one)

      expect(conditions()).toEqual([{ 'if-none-match': '*' }, { 'if-none-match': '*' }, { 'if-match': '"v1"' }])
      expect(shared.body()).toContain('deviceone')
      expect(shared.body()).toContain('devicetwo')
    })

    test('gives up, loudly, on a bucket that never holds still', async () => {
      await pair()

      let busy = false

      shared.afterRead = () => {
        if (busy) return

        busy = true
        follow(two, `https://again-${shared.version}.example/rss.xml`)

        return sync(two).then(() => { busy = false })
      }

      follow(one, 'https://from-one.example/rss.xml')

      const status = await sync(one)

      expect(status.status).toEqual('failed')
      expect(status.error).toMatch(/kept changing/)
      expect(shared.body()).not.toContain('from-one.example')
    })

    // The condition is a safeguard and never a requirement: storage that will
    // not take one is written to without it, as it always was.
    for (const refusal of ['cors', 501, 400]) {
      test(`writes without one to a bucket that cannot (${refusal}), and stops asking`, async () => {
        shared.cannot = refusal

        await sync(one)

        follow(one, 'https://more.example/rss.xml')

        const status = await sync(one)

        expect(conditions()).toEqual([{ 'if-none-match': '*' }, {}, {}])
        expect(shared.body()).toContain('more.example')
        expect(status.status).toEqual('saved')
      })
    }

    // Offline fails a conditional write and a plain one the same way, so it
    // must not be what teaches this device to stop asking.
    test('does not take being offline for a bucket that cannot', async () => {
      await sync(one)

      shared.offline = true
      follow(one, 'https://offline.example/rss.xml')

      expect((await sync(one)).status).toEqual('failed')

      shared.offline = false

      await sync(one)

      expect(conditions().pop()).toEqual({ 'if-match': '"v1"' })
      expect(shared.body()).toContain('offline.example')
    })
  })
})
