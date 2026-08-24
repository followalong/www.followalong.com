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

  // A poll writes a feeds.fetched event per feed. None of them can change an
  // entry, and throwing the entry list away for each was most of what a poll
  // over 200 feeds cost.
  test('keeps the entry list across an event that only touches feeds', () => {
    const before = queries.entriesForIdentity(identity)

    state.track(identity.id, 'feeds', 'f1', 'fetched', { etag: 'W/"1"' })

    expect(queries.entriesForIdentity(identity)).toBe(before)
  })

  test('throws the entry list away when an entry changes', () => {
    const before = queries.entriesForIdentity(identity)

    state.track(identity.id, 'entries', 'e1', 'markRead')

    expect(queries.entriesForIdentity(identity)).not.toBe(before)
  })

  // Roll up is the one event that folds into every collection while naming
  // only its own, so it has to say so itself.
  test('sees the entries a roll up brought, having read the old ones first', () => {
    expect(queries.entriesForIdentity(identity).length).toEqual(1)

    state.track(identity.id, 'identities', identity.id, 'rollup', {
      identity: { id: identity.id, name: 'Rolled' },
      feeds: [{ id: 'f9', url: 'https://c.example', data: { title: 'C' } }],
      entries: [Object.assign({ id: 'e7' }, entry('f9', 'g7', 'Seven'))],
      signals: []
    })

    expect(queries.entriesForIdentity(identity).map((e) => e.id)).toContain('e7')
    expect(queries.feedsForIdentity(identity).map((f) => f.id)).toContain('f9')
  })

  test('a signal with its own sort never reorders the shared list', () => {
    state.track(identity.id, 'entries', 'e2', 'create', entry('f1', 'g2', 'Two'))

    const before = queries.entriesForIdentity(identity).map((e) => e.id)
    const reversed = { id: 'rev', data: { permalink: 'rev', sort: '(queries) => { return (a, b) => a.id < b.id ? 1 : -1 }' } }

    queries.entriesForSignal(identity, reversed)

    expect(queries.entriesForIdentity(identity).map((e) => e.id)).toEqual(before)
  })
})

// importRaw re-folds the whole log, which replaces every projection object.
// An index that only notices the collection getting shorter keeps handing back
// the dead ones.
describe('Queries indexes after a re-fold', () => {
  let state, queries, identity, feed

  beforeEach(async () => {
    state = new MultiEventStore(`refold-${Math.random()}`, 'v2.3', runners)
    await state.clear()
    identity = { id: state.createDB(null, {}) }
    queries = new Queries({ state })

    state.track(identity.id, 'feeds', 'f1', 'create', { url: 'https://a.example', data: { title: 'A' } }, 10)
    state.track(identity.id, 'entries', 'e1', 'create', { feedId: 'f1', data: { id: 'g1', guid: 'g1', title: 'One' } }, 20)

    feed = queries.feedForIdentity(identity, 'f1')

    // warm the indexes, as any render would
    queries.entriesForFeed(identity, feed)
    queries.entryForFeedForIdentity(identity, feed, 'g1')
  })

  test('sees an entry that arrives by import', () => {
    state.importRaw(identity.id, '30/entries/e2/create/v2.3 {"feedId":"f1","data":{"id":"g2","guid":"g2","title":"Two"}}')

    expect(queries.entriesForFeed(identity, feed).length).toEqual(2)
    expect(queries.entryForFeedForIdentity(identity, feed, 'g2')).toBeTruthy()
  })

  test('does not hand back objects the re-fold discarded', () => {
    // Same event count after the fold, so a length check cannot notice.
    state.importRaw(identity.id, '5/entries/e0/create/v2.3 {"feedId":"f1","data":{"id":"g0","guid":"g0","title":"Zero"}}')

    const live = state.findById(identity.id, 'entries', 'e1')
    const viaIndex = queries.entryForFeedForIdentity(identity, feed, 'g1')

    expect(viaIndex).toBe(live)
  })
})

describe('Queries indexes after a re-fold that adds no entries', () => {
  test('does not keep serving objects the re-fold replaced', async () => {
    const state = new MultiEventStore(`refold2-${Math.random()}`, 'v2.3', runners)
    await state.clear()
    const identity = { id: state.createDB(null, {}) }
    const queries = new Queries({ state })

    state.track(identity.id, 'feeds', 'f1', 'create', { url: 'https://a.example', data: { title: 'A' } }, 10)
    state.track(identity.id, 'entries', 'e1', 'create', { feedId: 'f1', data: { id: 'g1', guid: 'g1', title: 'One' } }, 20)

    const feed = queries.feedForIdentity(identity, 'f1')

    queries.entryForFeedForIdentity(identity, feed, 'g1')
    queries.entriesForFeed(identity, feed)

    // A save arriving from sync: re-folds the log, replaces every projection
    // object, and leaves the entry count exactly as it was.
    state.importRaw(identity.id, '30/entries/e1/save/v2.3 {}')

    expect(queries.isEntrySaved(state.findById(identity.id, 'entries', 'e1'))).toBe(true)
    expect(queries.isEntrySaved(queries.entryForFeedForIdentity(identity, feed, 'g1'))).toBe(true)
    expect(queries.rawEntriesForFeed(identity, feed).filter((e) => queries.isEntrySaved(e)).length).toEqual(1)
  })
})
