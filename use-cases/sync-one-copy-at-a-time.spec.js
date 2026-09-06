import { mountApp, describe, story, s3Bucket, s3Response } from './helper.js'

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
      2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
      3/entries/6363/create/v2.1 {"feedId":"543","data":{"guid":"987","title":"Entry title"}}
      4/addons/s3addon/configure/v2.1 ${ADDON}
    `
  }
})

describe('Sync one copy at a time', () => {
  let app
  let identity
  let bucket
  let held
  let finishWrite

  beforeEach(async () => {
    held = []

    finishWrite = () => held.splice(0).forEach((resolve) => {
      resolve(s3Response({ headers: { etag: '"written"' } }))
    })

    bucket = s3Bucket({
      // The bucket is left holding every write, which is what a slow
      // connection and a large log look like from the device.
      answer: (request) => {
        if (request.method === 'PUT') return new Promise((resolve) => held.push(resolve))

        return s3Response({ status: 200, body: '', headers: { etag: '"remote"' } })
      }
    })

    app = await mountApp({ state: seed(), awsClient: bucket.client })
    identity = app.vm.queries.allIdentities()[0]

    await app.wait()
    finishWrite()
    await app.wait()
    bucket.requests.length = 0
  })

  const writes = () => bucket.requests.filter((request) => request.method === 'PUT').length

  // The log goes up whole, so a second write starting while the first is in
  // the air sends the same bytes twice and races the read that built them.
  story('does not start a second write while one is in the air', async () => {
    app.vm.commands.track(identity, 'entries', '6363', 'markRead')
    app.vm.commands.syncIdentity(identity)
    await app.wait()

    app.vm.commands.syncIdentity(identity)
    await app.wait()

    expect(writes()).toEqual(1)
  })

  // Coalescing must not swallow the reason for the second write: whatever was
  // tracked while the first was in the air still has to reach the bucket.
  story('writes once more for what was tracked while it was busy', async () => {
    app.vm.commands.track(identity, 'entries', '6363', 'markRead')
    app.vm.commands.syncIdentity(identity)
    await app.wait()

    app.vm.commands.track(identity, 'entries', '6363', 'markUnread')
    app.vm.commands.syncIdentity(identity)
    await app.wait()

    expect(writes()).toEqual(1)

    finishWrite()
    await app.wait()
    finishWrite()
    await app.wait()

    expect(writes()).toEqual(2)
  })

  // Coalescing has to end. A follow-up that queued its own follow-up would
  // upload the whole log forever.
  story('stops once nothing is waiting on it', async () => {
    app.vm.commands.track(identity, 'entries', '6363', 'markRead')
    app.vm.commands.syncIdentity(identity)

    for (let i = 0; i < 6; i++) {
      await app.wait()
      finishWrite()
    }

    const settled = writes()

    for (let i = 0; i < 6; i++) {
      await app.wait()
      finishWrite()
    }

    expect(writes()).toEqual(settled)
  })
})
