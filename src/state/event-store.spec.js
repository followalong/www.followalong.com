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
