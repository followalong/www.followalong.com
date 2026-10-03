/* global structuredClone */
import { describe, test, expect } from 'vitest'
import MultiEventStore from './multi-event-store.js'
import runners from './runners.js'

const store = () => new MultiEventStore(`config-${Math.random()}`, 'v2.3', runners)

// The store is handed to a Vue app, which makes everything under it deeply
// reactive, so anything read back out of a config is a Proxy. IndexedDB stores
// by structured clone and a Proxy cannot be cloned, so a config carrying one
// fails to save — and because a config is written whole, one bad value takes
// every other setting with it: the sync status, the version the bucket last
// answered with, the fingerprint that stops the whole log going up again.
describe('the config a device keeps', () => {
  test('saves a value that arrived wrapped in a proxy', () => {
    const state = store()
    const id = state.createDB(null, {})

    state.updateConfig(id, { sessions: new Proxy([{ at: 1 }], {}) })

    expect(() => structuredClone(state.getConfig(id))).not.toThrow()
  })

  test('saves a value nested inside a proxy', () => {
    const state = store()
    const id = state.createDB(null, {})

    state.updateConfig(id, { sessions: [new Proxy({ at: 1 }, {})] })

    expect(() => structuredClone(state.getConfig(id))).not.toThrow()
  })

  test('keeps what it was given', () => {
    const state = store()
    const id = state.createDB(null, {})

    state.updateConfig(id, { syncStatus: 'saved', sessions: [{ at: 1, playing: null }] })
    state.updateConfig(id, { syncedAt: 7 })

    expect(state.getConfig(id)).toEqual({
      syncStatus: 'saved',
      syncedAt: 7,
      sessions: [{ at: 1, playing: null }]
    })
  })
})

// A note is the one thing written as the page goes away, so it has to be on
// disk the moment setNote returns: a second store over the same disk reads it
// with nothing awaited in between.
describe('the notes a device keeps', () => {
  test('are on disk before the call returns', () => {
    const name = `notes-${Math.random()}`
    const state = new MultiEventStore(name, 'v2.3', runners)
    const id = state.createDB(null, {})

    state.setNote(id, 'runs', [{ at: 1 }])

    expect(new MultiEventStore(name, 'v2.3', runners).getNote(id, 'runs')).toEqual([{ at: 1 }])
  })

  test('read as nothing when never written', () => {
    const state = store()

    expect(state.getNote('nobody', 'runs')).toEqual(null)
  })

  test('go with the identity', async () => {
    const state = store()
    const id = state.createDB(null, {})

    state.setNote(id, 'runs', [{ at: 1 }])
    await state.deleteDB(id)

    expect(state.getNote(id, 'runs')).toEqual(null)
  })

  test('cost nothing when the store is blocked', () => {
    const state = store()
    const setItem = Storage.prototype.setItem

    Storage.prototype.setItem = () => { throw new Error('QuotaExceededError') }

    try {
      expect(() => state.setNote('a', 'runs', [])).not.toThrow()
    } finally {
      Storage.prototype.setItem = setItem
    }
  })
})
