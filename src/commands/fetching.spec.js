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
