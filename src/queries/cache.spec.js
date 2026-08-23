import { describe, test, expect, beforeEach } from 'vitest'
import MultiEventStore from '../state/multi-event-store.js'
import runners from '../state/runners.js'
import Queries from './index.js'

// The derived reads are cached against the store revision. Everything here is
// about the cache being thrown away when it should be.
describe('Queries caching', () => {
  let state
  let queries
  let identity

  const entry = (feedId, guid, title) => ({ feedId, data: { id: guid, guid, title, pubDate: 'Mon, 01 May 2023 00:00:00 GMT' } })

  beforeEach(async () => {
    state = new MultiEventStore(`cache-${Math.random()}`, 'v2.3', runners)
    await state.clear()
    identity = { id: state.createDB(null, {}) }
    queries = new Queries({ state })

    state.track(identity.id, 'feeds', 'f1', 'create', { url: 'https://a.example', data: { title: 'A' } })
    state.track(identity.id, 'entries', 'e1', 'create', entry('f1', 'g1', 'One'))
  })

  test('sees an entry added after the first read', () => {
    expect(queries.entriesForIdentity(identity).length).toEqual(1)

    state.track(identity.id, 'entries', 'e2', 'create', entry('f1', 'g2', 'Two'))

    expect(queries.entriesForIdentity(identity).length).toEqual(2)
  })

  test('regroups by feed after a new feed and entry', () => {
    const feed1 = queries.feedForIdentity(identity, 'f1')

    expect(queries.entriesForFeed(identity, feed1).length).toEqual(1)

    state.track(identity.id, 'feeds', 'f2', 'create', { url: 'https://b.example', data: { title: 'B' } })
    state.track(identity.id, 'entries', 'e3', 'create', entry('f2', 'g3', 'Three'))

    expect(queries.entriesForFeed(identity, feed1).length).toEqual(1)
    expect(queries.entriesForFeed(identity, queries.feedForIdentity(identity, 'f2')).length).toEqual(1)
  })

  test('finds an entry by key that did not exist at first read', () => {
    const feed1 = queries.feedForIdentity(identity, 'f1')

    expect(queries.entryForFeedForIdentity(identity, feed1, 'g9')).toBeUndefined()

    state.track(identity.id, 'entries', 'e9', 'create', entry('f1', 'g9', 'Nine'))

    expect(queries.entryForFeedForIdentity(identity, feed1, 'g9').data.title).toEqual('Nine')
  })

  test('drops an entry from its feed once deleted', () => {
    const feed1 = queries.feedForIdentity(identity, 'f1')

    expect(queries.entriesForFeed(identity, feed1).length).toEqual(1)

    state.track(identity.id, 'entries', 'e1', 'delete')

    expect(queries.entriesForFeed(identity, feed1).length).toEqual(0)
  })

  test('recounts unread after the entry is read', () => {
    const signal = { id: 's1', data: { title: 'Home', permalink: 'home' } }

    expect(queries.unreadEntriesForSignalLength(identity, signal)).toEqual(1)

    state.track(identity.id, 'entries', 'e1', 'markRead')

    expect(queries.unreadEntriesForSignalLength(identity, signal)).toEqual(0)
  })

  test('keeps signals with different filters apart', () => {
    state.track(identity.id, 'entries', 'e2', 'create', entry('f1', 'g2', 'Two'))
    state.track(identity.id, 'entries', 'e2', 'markRead')

    const all = { id: 'all', data: { permalink: 'all' } }
    const done = { id: 'done', data: { permalink: 'done', filter: '(queries) => { return (entry) => !!entry.readAt }' } }

    expect(queries.entriesForSignal(identity, all).length).toEqual(2)
    expect(queries.entriesForSignal(identity, done).length).toEqual(1)
    expect(queries.entriesForSignal(identity, all).length).toEqual(2)
  })

  test('a signal with its own sort never reorders the shared list', () => {
    state.track(identity.id, 'entries', 'e2', 'create', entry('f1', 'g2', 'Two'))

    const before = queries.entriesForIdentity(identity).map((e) => e.id)
    const reversed = { id: 'rev', data: { permalink: 'rev', sort: '(queries) => { return (a, b) => a.id < b.id ? 1 : -1 }' } }

    queries.entriesForSignal(identity, reversed)

    expect(queries.entriesForIdentity(identity).map((e) => e.id)).toEqual(before)
  })
})
