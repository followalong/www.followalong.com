import { mountApp, describe, story, s3Bucket, s3Response } from './helper.js'

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

// One bucket, two devices.
const bucket = () => {
  const shared = s3Bucket()

  shared.answer = (request) => {
    if (shared.unreadable) {
      return s3Response({ status: 403, body: '<Error><Code>Access denied</Code></Error>' })
    }

    return request.method === 'PUT' ? shared.store(request) : shared.read(request)
  }

  return shared
}

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
})
