import { describe, test, expect, beforeEach } from 'vitest'
import MultiEventStore from '../state/multi-event-store.js'
import runners from '../state/runners.js'
import Queries from '../queries/index.js'
import Commands from './index.js'
import FetchError from '../adapters/fetch-error.js'

const FEED_XML = (title) => `<rss><channel><title>${title}</title><item><guid>g1</guid><title>One</title></item></channel></rss>`

describe('conditional fetching', () => {
  let state, queries, commands, identity, feed, calls, respond

  beforeEach(async () => {
    calls = []
    respond = () => Promise.resolve({ status: 200, body: FEED_XML('A'), etag: '"v1"', lastModified: 'Mon, 01 May 2023 00:00:00 GMT' })

    const fetch = (url, options) => {
      calls.push({ url, options })
      return respond(url, options)
    }

    state = new MultiEventStore(`fetching-${Math.random()}`, 'v2.3', runners)
    await state.clear()
    identity = { id: state.createDB(null, {}) }
    queries = new Queries({ state, fetch })
    commands = new Commands({ state, queries, fetch })

    state.track(identity.id, 'feeds', 'f1', 'create', { url: 'https://a.example/feed', data: { title: 'A' } })
    feed = queries.feedForIdentity(identity, 'f1')
  })

  const reload = () => queries.feedForIdentity(identity, 'f1')

  test('sends no validators on the first fetch', async () => {
    await commands.fetchFeed(identity, feed)

    expect(calls[0].options).toEqual({})
  })

  test('remembers the validators the feed returned', async () => {
    await commands.fetchFeed(identity, feed)

    expect(reload().etag).toEqual('"v1"')
    expect(reload().lastModified).toEqual('Mon, 01 May 2023 00:00:00 GMT')
  })

  test('sends the validators back on the next fetch', async () => {
    await commands.fetchFeed(identity, feed)
    await commands.fetchFeed(identity, reload())

    expect(calls[1].options).toMatchObject({ etag: '"v1"', lastModified: 'Mon, 01 May 2023 00:00:00 GMT' })
  })

  test('keeps its entries when the feed answers 304', async () => {
    await commands.fetchFeed(identity, feed)
    const before = queries.entriesForFeed(identity, reload()).length

    respond = () => Promise.resolve({ status: 304, body: '' })
    await commands.fetchFeed(identity, reload())

    expect(queries.entriesForFeed(identity, reload()).length).toEqual(before)
    expect(before).toBeGreaterThan(0)
  })

  test('records a 304 as a fetch so the feed is not immediately stale', async () => {
    await commands.fetchFeed(identity, feed)

    respond = () => Promise.resolve({ status: 304, body: '' })
    await commands.fetchFeed(identity, reload())

    expect(reload().updatedAt).toBeGreaterThan(0)
  })

  test('keeps the validators through a 304', async () => {
    await commands.fetchFeed(identity, feed)

    respond = () => Promise.resolve({ status: 304, body: '' })
    await commands.fetchFeed(identity, reload())

    expect(reload().etag).toEqual('"v1"')
  })
})

describe('failure backoff', () => {
  let state, queries, commands, identity, calls, respond

  beforeEach(async () => {
    calls = []
    respond = () => Promise.reject(new FetchError(403, 'https://a.example/feed'))

    const fetch = (url, options) => {
      calls.push({ url, options })
      return respond(url, options)
    }

    state = new MultiEventStore(`backoff-${Math.random()}`, 'v2.3', runners)
    await state.clear()
    identity = { id: state.createDB(null, {}) }
    queries = new Queries({ state, fetch })
    commands = new Commands({ state, queries, fetch })

    state.track(identity.id, 'feeds', 'f1', 'create', { url: 'https://a.example/feed', data: { title: 'A' } })
  })

  const reload = () => queries.feedForIdentity(identity, 'f1')

  test('records the failure against the feed', async () => {
    await expect(commands.fetchFeed(identity, reload())).rejects.toThrow(FetchError)

    expect(reload().failureCount).toEqual(1)
    expect(reload().failedAt).toBeGreaterThan(0)
  })

  test('counts repeated failures even though only the latest event is kept', async () => {
    await expect(commands.fetchFeed(identity, reload())).rejects.toThrow()
    await expect(commands.fetchFeed(identity, reload())).rejects.toThrow()
    await expect(commands.fetchFeed(identity, reload())).rejects.toThrow()

    expect(reload().failureCount).toEqual(3)
  })

  test('holds a failing feed back from the next sweep', async () => {
    await expect(commands.fetchFeed(identity, reload())).rejects.toThrow()

    expect(queries.feedsToFetchForIdentity(identity).map((f) => f.id)).not.toContain('f1')
  })

  test('clears the failure once the feed answers again', async () => {
    await expect(commands.fetchFeed(identity, reload())).rejects.toThrow()

    respond = () => Promise.resolve({ status: 200, body: FEED_XML('A') })
    await commands.fetchFeed(identity, reload())

    expect(reload().failureCount).toBeFalsy()
    expect(reload().failedAt).toBeFalsy()
    expect(queries.feedsToFetchForIdentity(identity).map((f) => f.id)).toContain('f1')
  })
})

// A refusal is the feed's fault and waiting longer is the right answer. An
// error thrown while reading a response we did receive is ours, and a day of
// backoff only hides it — the feed goes silent and nothing says why.
describe('an error of our own while reading a good response', () => {
  let state, queries, commands, identity

  // No guid, no id, no link: keyForEntry has nothing to key on and throws,
  // from inside the fold rather than from the request.
  const UNKEYABLE = '<rss><channel><title>A</title><item><title>No key</title></item></channel></rss>'

  beforeEach(async () => {
    const fetch = () => Promise.resolve({ status: 200, body: UNKEYABLE })

    state = new MultiEventStore(`fold-error-${Math.random()}`, 'v2.3', runners)
    await state.clear()
    identity = { id: state.createDB(null, {}) }
    queries = new Queries({ state, fetch })
    commands = new Commands({ state, queries, fetch })

    state.track(identity.id, 'feeds', 'f1', 'create', { url: 'https://a.example/feed', data: { title: 'A' } })
  })

  const reload = () => queries.feedForIdentity(identity, 'f1')

  test('does not blame the feed for it', async () => {
    await expect(commands.fetchFeed(identity, reload())).rejects.toThrow()

    expect(reload().failureCount).toBeFalsy()
    expect(reload().failedAt).toBeFalsy()
  })

  test('leaves the feed in the next sweep rather than backing it off', async () => {
    await expect(commands.fetchFeed(identity, reload())).rejects.toThrow()

    expect(queries.feedsToFetchForIdentity(identity).map((f) => f.id)).toContain('f1')
  })
})

describe('polling only what is stale', () => {
  let state, queries, commands, identity, fetched

  beforeEach(async () => {
    fetched = []

    const fetch = (url) => {
      fetched.push(url)
      return Promise.resolve({ status: 200, body: FEED_XML('A') })
    }

    state = new MultiEventStore(`stale-${Math.random()}`, 'v2.3', runners)
    await state.clear()
    identity = { id: state.createDB(null, {}) }
    queries = new Queries({ state, fetch })
    commands = new Commands({ state, queries, fetch })

    state.track(identity.id, 'feeds', 'f1', 'create', { url: 'https://a.example/feed', data: { title: 'A' } })
    state.track(identity.id, 'feeds', 'f2', 'create', { url: 'https://b.example/feed', data: { title: 'B' } })
  })

  test('fetches feeds that have never been fetched', async () => {
    await commands.fetchOutdatedFeeds(identity)

    expect(fetched.length).toEqual(2)
  })

  test('does not refetch a feed it just fetched', async () => {
    await commands.fetchOutdatedFeeds(identity)
    fetched = []

    await commands.fetchOutdatedFeeds(identity)

    expect(fetched).toEqual([])
  })

  test('skips a feed with no url', async () => {
    state.track(identity.id, 'feeds', 'f3', 'create', { data: { title: 'C' } })

    await commands.fetchOutdatedFeeds(identity)

    expect(fetched.length).toEqual(2)
  })

  test('skips a paused feed', async () => {
    state.track(identity.id, 'feeds', 'f2', 'pause')

    await commands.fetchOutdatedFeeds(identity)

    expect(fetched).toEqual(['https://a.example/feed'])
  })
})

// What keeps a release of held-back feeds from becoming a burst. One feed is
// in flight at a time whatever the sweep is handed, which is the whole reason
// a shared proxy IP survives a library this size.
describe('sweeping a lot of feeds at once', () => {
  test('fetches them one at a time, never in parallel', async () => {
    let inFlight = 0
    let mostAtOnce = 0

    const fetch = () => {
      inFlight++
      mostAtOnce = Math.max(mostAtOnce, inFlight)

      return new Promise((resolve) => setTimeout(() => {
        inFlight--
        resolve({ status: 200, body: FEED_XML('A') })
      }, 0))
    }

    const state = new MultiEventStore(`series-${Math.random()}`, 'v2.3', runners)
    await state.clear()

    const identity = { id: state.createDB(null, {}) }
    const queries = new Queries({ state, fetch })
    const commands = new Commands({ state, queries, fetch })

    for (let n = 0; n < 12; n++) {
      state.track(identity.id, 'feeds', `f${n}`, 'create', { url: `https://f${n}.example/feed`, data: { title: `F${n}` } })
    }

    await commands.fetchFeedsForIdentity(identity)

    expect(mostAtOnce).toEqual(1)
  })
})

// A failure recorded with no HTTP status behind it never carried a refusal
// from a server. It is either an error of ours or a host that could not be
// reached at all, and neither earns a day of silence without one more try.
describe('releasing failures that no server refused', () => {
  let state, queries, commands, identity

  const fail = (feedId, { count, status }) => {
    state.track(identity.id, 'feeds', feedId, 'fetchFailed', { count, status })
  }

  const reload = (feedId) => queries.feedForIdentity(identity, feedId)

  beforeEach(async () => {
    const fetch = () => Promise.resolve({ status: 200, body: FEED_XML('A') })

    state = new MultiEventStore(`release-${Math.random()}`, 'v2.3', runners)
    await state.clear()
    identity = { id: state.createDB(null, {}) }
    queries = new Queries({ state, fetch })
    commands = new Commands({ state, queries, fetch })

    state.track(identity.id, 'feeds', 'ours', 'create', { url: 'https://a.example/feed', data: { title: 'A' } })
    state.track(identity.id, 'feeds', 'refused', 'create', { url: 'https://b.example/feed', data: { title: 'B' } })

    fail('ours', { count: 9, status: undefined })
    fail('refused', { count: 9, status: 403 })
  })

  test('polls a statusless failure again on the next sweep', () => {
    expect(queries.feedsToFetchForIdentity(identity).map((f) => f.id)).not.toContain('ours')

    commands.releaseUnrefusedFailuresForIdentity(identity)

    expect(queries.feedsToFetchForIdentity(identity).map((f) => f.id)).toContain('ours')
  })

  test('leaves a feed a server actually refused where it was', () => {
    commands.releaseUnrefusedFailuresForIdentity(identity)

    expect(queries.feedsToFetchForIdentity(identity).map((f) => f.id)).not.toContain('refused')
    expect(reload('refused').failedAt).toBeGreaterThan(0)
  })

  // One more attempt, not a fresh start. A host that is genuinely unreachable
  // fails again and goes straight back to the backoff it had earned, rather
  // than climbing from fifteen minutes every time this runs.
  test('keeps the failure count so an unreachable feed backs off where it left off', async () => {
    commands.releaseUnrefusedFailuresForIdentity(identity)

    expect(queries.failureCountForFeed(reload('ours'))).toEqual(9)

    commands.fetch = () => Promise.reject(new Error('Failed to fetch'))
    queries.fetch = commands.fetch

    await expect(commands.fetchFeed(identity, reload('ours'))).rejects.toThrow()

    expect(queries.failureCountForFeed(reload('ours'))).toEqual(10)
  })

  test('a feed that answers is clear of the failure entirely', async () => {
    commands.releaseUnrefusedFailuresForIdentity(identity)

    await commands.fetchFeed(identity, reload('ours'))

    expect(reload('ours').failureCount).toBeFalsy()
    expect(reload('ours').failedAt).toBeFalsy()
  })

  test('forgives each feed once however often it is asked', () => {
    const cleared = () => state.findAllEvents(identity.id).filter((e) => e.action === 'clearFailure').length

    commands.releaseUnrefusedFailuresForIdentity(identity)

    expect(cleared()).toEqual(1)

    commands.releaseUnrefusedFailuresForIdentity(identity)

    expect(cleared()).toEqual(1)
  })

  // The pass belongs to loading, so it runs without anyone pressing anything,
  // and the marker it leaves has to survive the reload it is guarding against.
  test('runs on load, and not again on the next one', async () => {
    const name = `release-boot-${Math.random()}`
    const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

    const seed = new MultiEventStore(name, 'v2.3', runners)
    await seed.clear()

    const dbId = seed.createDB(null, {})

    seed.track(dbId, 'identities', dbId, 'create', { name: 'Me' })
    seed.track(dbId, 'feeds', 'ours', 'create', { url: 'https://a.example/feed', data: { title: 'A' } })
    seed.track(dbId, 'feeds', 'ours', 'fetchFailed', { count: 9 })

    await settle()

    const boot = async () => {
      const booted = new MultiEventStore(name, 'v2.3', runners)
      const bootedQueries = new Queries({ state: booted })

      await new Commands({ state: booted, queries: bootedQueries }).restoreFromLocal()
      await settle()

      return booted.findAllEvents(dbId).filter((e) => e.action === 'clearFailure').length
    }

    expect(await boot()).toEqual(1)
    expect(await boot()).toEqual(1)
  })
})
