import { flushPromises } from '@vue/test-utils'
import { mountApp, describe, story, test, s3Bucket, vi } from './helper.js'

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

const SEED = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
`

const ELSEWHERE = 'https://elsewhere.example/rss.xml'

// One bucket. `hold` keeps a read in the air until `land` is called.
const bucket = () => {
  const shared = s3Bucket()

  shared.answer = (request) => {
    const response = request.method === 'PUT' ? shared.store(request) : shared.read(request)

    if (!shared.hold || request.method === 'PUT') return response

    return new Promise((resolve) => { shared.land = () => resolve(response) })
  }

  return shared
}

// The same identity on every device, as a handoff leaves it.
const device = (shared, { synced = true, ...options } = {}) => mountApp({
  awsClient: shared.client,
  state: { abc123: { config: {}, data: `${SEED}${synced ? `3/addons/s3addon/configure/v2.1 ${ADDON}` : ''}` } },
  ...options
})

const sync = (app) => app.vm.commands.syncIdentity(app.vm.identity)

// Promises only: running the timers would run the rest between two pulls.
const settle = async () => {
  for (let i = 0; i < 20; i++) await flushPromises()
}

const fire = (event, on = window) => on.dispatchEvent(new Event(event))
const hide = () => Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
const show = () => delete document.visibilityState

const feeds = (app) => app.vm.queries.feedsForIdentity(app.vm.identity).map((feed) => app.vm.queries.urlForFeed(feed))

describe('See what another device changed', () => {
  let shared
  let one

  const follows = (two) => two.vm.commands.track(two.vm.identity, 'feeds', null, 'create', { url: ELSEWHERE, data: { title: 'Elsewhere' } })

  // Another device changes something and puts it up, while one sits open. It
  // is closed again after: every open app hears the one window there is.
  const elsewhere = async (change = follows) => {
    const two = await device(shared)

    change(two)

    await sync(two)
    two.unmount()
    shared.requests.length = 0
  }

  const open = async (options) => {
    one = await device(shared, options)

    await sync(one)
  }

  beforeEach(() => {
    shared = bucket()
  })

  afterEach(() => {
    show()
    one.unmount()
  })

  story('shows it when the window is shown again', async () => {
    await open()
    await elsewhere()

    fire('visibilitychange', document)
    await settle()

    expect(feeds(one)).toContain(ELSEWHERE)
  })

  story('shows it when the window is focused again', async () => {
    await open()
    await elsewhere()

    fire('focus')
    await settle()

    expect(feeds(one)).toContain(ELSEWHERE)
  })

  story('shows it when the device comes back online', async () => {
    await open()
    await elsewhere()

    fire('online')
    await settle()

    expect(feeds(one)).toContain(ELSEWHERE)
  })

  // The helper runs every timer there is, which a clock never survives, so
  // the app is mounted without one and this starts its own.
  story('shows it after a while with nothing done', async () => {
    await open()
    await elsewhere()

    one.vm.commands.pullEveryMs = 60000

    const stop = one.vm.commands.pullWhileOpen(() => one.vm.identity)

    vi.advanceTimersByTime(60000)
    await settle()
    stop()

    expect(feeds(one)).toContain(ELSEWHERE)

    shared.requests.length = 0
    vi.advanceTimersByTime(60000)
    await settle()

    expect(shared.requests).toEqual([])
  })

  // The shell holds the identity as a projection object, and a merge replaces
  // every one of them.
  story('shows what the identity was renamed to', async () => {
    await open()
    await elsewhere((two) => two.vm.commands.renameIdentity(two.vm.identity, 'Renamed elsewhere'))

    fire('focus')
    await settle()

    expect(one.vm.queries.nameForIdentity(one.vm.identity)).toEqual('Renamed elsewhere')
  })

  test('asks nothing while the window is hidden, and asks again once it shows', async () => {
    await open()
    await elsewhere()

    hide()
    fire('visibilitychange', document)
    fire('focus')
    fire('online')
    await settle()

    expect(shared.requests).toEqual([])

    show()
    fire('visibilitychange', document)
    await settle()

    expect(feeds(one)).toContain(ELSEWHERE)
  })

  // Coming back to a window fires focus, visibility and often online at once.
  test('never starts a second pull while one is in the air', async () => {
    await open()
    await elsewhere()

    shared.hold = true
    fire('focus')
    fire('visibilitychange', document)
    fire('online')
    fire('focus')
    await settle()

    expect(shared.reads().length).toEqual(1)

    shared.hold = false
    shared.land()
    await settle()

    expect(feeds(one)).toContain(ELSEWHERE)
    expect(shared.reads().length).toEqual(1)
  })

  test('makes asks on the heels of a pull one more pull, after a rest', async () => {
    await open({ pullGapMs: 5000 })
    shared.requests.length = 0

    fire('focus')
    await settle()
    fire('visibilitychange', document)
    fire('online')
    fire('focus')
    await settle()

    expect(shared.reads().length).toEqual(1)

    vi.advanceTimersByTime(5000)
    await settle()

    expect(shared.reads().length).toEqual(2)

    vi.advanceTimersByTime(5000)
    await settle()

    expect(shared.reads().length).toEqual(2)
  })

  test('costs one conditional read and no write when the bucket has not moved', async () => {
    await open()
    shared.requests.length = 0

    fire('focus')
    await settle()

    expect(shared.requests.map((request) => [request.method, request.headers])).toEqual([['GET', { 'if-none-match': '"v1"' }]])
  })

  // Two open windows would otherwise hand the same log back and forth for as
  // long as both stayed open, a whole upload a minute each.
  test('does not write back what it has just read', async () => {
    await open()
    await elsewhere()

    fire('focus')
    await settle()

    expect(feeds(one)).toContain(ELSEWHERE)
    expect(shared.writes()).toEqual([])
  })

  test('asks nothing of a device with no bucket', async () => {
    one = await device(shared, { synced: false })
    shared.requests.length = 0

    fire('focus')
    fire('visibilitychange', document)
    fire('online')
    await settle()

    expect(shared.requests).toEqual([])
  })

  test('asks nothing once the app is closed', async () => {
    await open()
    one.unmount()
    shared.requests.length = 0

    fire('focus')
    fire('visibilitychange', document)
    fire('online')
    await settle()

    expect(shared.requests).toEqual([])
  })
})
