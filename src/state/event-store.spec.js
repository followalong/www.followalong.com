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
