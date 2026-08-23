import { describe, test, expect, beforeEach } from 'vitest'
import EventStore from './event-store.js'
import MultiEventStore from './multi-event-store.js'

const RUNNERS = {
  'feeds.create': EventStore.RUNNERS.CREATE,
  'feeds.update': EventStore.RUNNERS.UPDATE,
  'feeds.delete': EventStore.RUNNERS.DELETE
}

describe('EventStore#track', () => {
  let store

  beforeEach(async () => {
    store = new EventStore(`test-${Math.random()}`, 'v1', RUNNERS)
    await store.reset()
  })

  test('returns the event it appended', () => {
    const event = store.track('feeds', 'abc', 'create', { url: 'https://foo.bar' })

    expect(event.collection).toEqual('feeds')
    expect(event.objectId).toEqual('abc')
    expect(event.action).toEqual('create')
  })

  test('returns the generated id when none is supplied', () => {
    const event = store.track('feeds', null, 'create', { url: 'https://foo.bar' })

    expect(event.objectId).toBeTruthy()
    expect(store.findById('feeds', event.objectId)).toBeTruthy()
  })
})

describe('MultiEventStore#track', () => {
  let store
  let dbId

  beforeEach(async () => {
    store = new MultiEventStore(`test-${Math.random()}`, 'v1', RUNNERS)
    await store.clear()
    dbId = store.createDB(null)
  })

  test('returns the event so commands can read the generated id', () => {
    const event = store.track(dbId, 'feeds', null, 'create', { url: 'https://foo.bar' })

    expect(event.objectId).toBeTruthy()
    expect(store.findById(dbId, 'feeds', event.objectId)).toBeTruthy()
  })
})

describe('EventStore#restore', () => {
  test('replays events in time order, not key order', async () => {
    const name = `test-${Math.random()}`
    const seed = new EventStore(name, 'v1', RUNNERS)

    await seed.reset()

    // Keys sort lexicographically as "1", "10", "2", so a store that replays
    // in key order applies the t=2 update last and ends up with the wrong url.
    seed.importRaw([
      '1/feeds/abc/create/v1 {"url":"first"}',
      '10/feeds/abc/update/v1 {"url":"last"}',
      '2/feeds/abc/update/v1 {"url":"middle"}'
    ].join('\n'))

    const restored = new EventStore(name, 'v1', RUNNERS)
    await restored.restore()

    expect(restored.findById('feeds', 'abc').url).toEqual('last')
  })
})

describe('EventStore#findAllEvents', () => {
  test('returns events oldest first', () => {
    const store = new EventStore(`test-${Math.random()}`, 'v1', RUNNERS)

    store.track('feeds', 'a', 'create', {}, 30)
    store.track('feeds', 'b', 'create', {}, 10)
    store.track('feeds', 'c', 'create', {}, 20)

    expect(store.findAllEvents().map((e) => e.objectId)).toEqual(['b', 'c', 'a'])
  })
})

describe('EventStore.RUNNERS.DELETE', () => {
  let store

  beforeEach(async () => {
    store = new EventStore(`test-${Math.random()}`, 'v1', RUNNERS)
    await store.reset()
  })

  test('records when the object was deleted', () => {
    store.track('feeds', 'abc', 'create', { url: 'https://foo.bar' })
    store.track('feeds', 'abc', 'delete', {}, 4242)

    expect(store.findByIdWithDeleted('feeds', 'abc').deletedAt).toEqual(4242)
    expect(store.findById('feeds', 'abc')).toBeUndefined()
  })

  test('ignores a delete for an object it never saw', () => {
    expect(() => store.track('feeds', 'nope', 'delete')).not.toThrow()
  })
})

describe('MultiEventStore collections', () => {
  test('does not expose a version key as a collection', () => {
    const store = new MultiEventStore(`test-${Math.random()}`, 'v2.2', {
      ...RUNNERS,
      'v2.1': { 'feeds.create': EventStore.RUNNERS.CREATE }
    })

    expect(store.v2).toBeUndefined()
    expect(store.feeds).toEqual([])
  })
})

describe('MultiEventStore config', () => {
  let store

  beforeEach(async () => {
    store = new MultiEventStore(`test-${Math.random()}`, 'v1', RUNNERS)
    await store.clear()
  })

  test('keeps the config createDB was given', () => {
    const dbId = store.createDB(null, { lastBackgroundFetch: 99 })

    expect(store.getConfig(dbId)).toEqual({ lastBackgroundFetch: 99 })
  })

  test('merges updates into the existing config', async () => {
    const dbId = store.createDB(null, { lastBackgroundFetch: 99 })

    await store.updateConfig(dbId, { somethingElse: true })

    expect(store.getConfig(dbId)).toEqual({ lastBackgroundFetch: 99, somethingElse: true })
  })

  test('restores config from the root db', async () => {
    const name = `test-${Math.random()}`
    const seed = new MultiEventStore(name, 'v1', RUNNERS)

    await seed.clear()

    const dbId = seed.createDB(null, { lastBackgroundFetch: 99 })

    const restored = new MultiEventStore(name, 'v1', RUNNERS)
    await restored.restore()

    expect(restored.getConfig(dbId).lastBackgroundFetch).toEqual(99)
  })

  test('forgets config for a deleted db', async () => {
    const dbId = store.createDB(null, { lastBackgroundFetch: 99 })

    await store.deleteDB(dbId)

    expect(store.getConfig(dbId)).toEqual({})
  })
})

describe('EventStore indexing', () => {
  let store

  beforeEach(async () => {
    store = new EventStore(`test-${Math.random()}`, 'v1', RUNNERS)
    await store.reset()
  })

  test('finds by id without scanning the collection', () => {
    for (let i = 0; i < 100; i++) store.track('feeds', `f${i}`, 'create', { url: `u${i}` })

    expect(store.findByIdWithDeleted('feeds', 'f42').url).toEqual('u42')
    expect(store.findById('feeds', 'f42').url).toEqual('u42')
  })

  test('keeps the index correct across update and delete', () => {
    store.track('feeds', 'abc', 'create', { url: 'first' })
    store.track('feeds', 'abc', 'update', { url: 'second' })

    expect(store.findById('feeds', 'abc').url).toEqual('second')

    store.track('feeds', 'abc', 'delete')

    expect(store.findById('feeds', 'abc')).toBeUndefined()
    expect(store.findByIdWithDeleted('feeds', 'abc')._deleted).toBe(true)
  })

  test('rebuilds the index when the log is re-folded', async () => {
    store.track('feeds', 'abc', 'create', { url: 'local' }, 10)
    store.importRaw('5/feeds/xyz/create/v1 {"url":"remote"}')

    expect(store.findById('feeds', 'xyz').url).toEqual('remote')
    expect(store.findById('feeds', 'abc').url).toEqual('local')
  })

  test('clears the index on reset', async () => {
    store.track('feeds', 'abc', 'create', { url: 'first' })
    await store.reset()

    expect(store.findById('feeds', 'abc')).toBeUndefined()
    expect(store.findAll('feeds').length).toEqual(0)
  })

  test('bumps a revision on every event so readers can cache', () => {
    const before = store.revision

    store.track('feeds', 'abc', 'create', { url: 'first' })

    expect(store.revision).toBeGreaterThan(before)
  })
})

describe('EventStore.RUNNERS.CREATE with an id already present', () => {
  let store

  beforeEach(async () => {
    store = new EventStore(`test-${Math.random()}`, 'v1', RUNNERS)
    await store.reset()
  })

  // UPDATE falls back to CREATE for an object it has not seen. When the real
  // create then replays, a blind push leaves two objects sharing one id: the
  // indexed one and a ghost that findAll still returns.
  test('does not leave two objects sharing one id', () => {
    store.importRaw([
      '9000/feeds/phantom/update/v1 {"title":"Arrived first"}',
      '9100/feeds/phantom/create/v1 {"url":"https://real.example/rss","title":"Real"}'
    ].join('\n'))

    expect(store.findAll('feeds').length).toEqual(1)
    expect(store.findAll('feeds').filter((f) => !f.url).length).toEqual(0)
    expect(store.findById('feeds', 'phantom').url).toEqual('https://real.example/rss')
  })

  test('keeps what the update had already set', () => {
    store.importRaw([
      '9000/feeds/phantom/update/v1 {"title":"Arrived first"}',
      '9100/feeds/phantom/create/v1 {"url":"https://real.example/rss"}'
    ].join('\n'))

    const feed = store.findById('feeds', 'phantom')

    expect(feed.url).toEqual('https://real.example/rss')
    expect(feed.title).toEqual('Arrived first')
    expect(feed.createdAt).toEqual(9100)
  })
})
