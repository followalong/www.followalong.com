import { describe, test, expect, beforeEach } from 'vitest'
import MultiEventStore from '../state/multi-event-store.js'
import runners from '../state/runners.js'
import Queries from './index.js'

// What a roll up keeps, and the only thing standing between the tidy-up
// button and a reader's history.
describe('What is worth keeping through a roll up', () => {
  let state
  let queries
  let identity

  const add = (feedId, n, { read = false, saved = false } = {}) => {
    const id = `${feedId}-${n}`

    state.track(identity.id, 'entries', id, 'create', {
      feedId,
      data: { id, guid: id, title: id, pubDate: new Date(1700000000000 + n * 60000).toUTCString() }
    })

    if (read) state.track(identity.id, 'entries', id, 'markRead')
    if (saved) state.track(identity.id, 'entries', id, 'save')

    return id
  }

  beforeEach(async () => {
    state = new MultiEventStore(`trim-${Math.random()}`, 'v2.3', runners)
    await state.clear()
    identity = { id: state.createDB(null, {}) }
    queries = new Queries({ state })

    state.track(identity.id, 'feeds', 'f1', 'create', { url: 'https://a.example', data: { title: 'A' } })
    state.track(identity.id, 'feeds', 'f2', 'create', { url: 'https://b.example', data: { title: 'B' } })
  })

  test('keeps the cap for each feed, not one cap shared between them', () => {
    for (let n = 0; n < 20; n++) {
      add('f1', n, { read: true })
      add('f2', n, { read: true })
    }

    const kept = queries.entriesWorthKeepingForIdentity(identity, 5)

    expect(kept.filter((e) => e.feedId === 'f1').length).toEqual(5)
    expect(kept.filter((e) => e.feedId === 'f2').length).toEqual(5)
  })

  test('keeps every unread entry however many there are', () => {
    for (let n = 0; n < 20; n++) add('f1', n)

    expect(queries.entriesWorthKeepingForIdentity(identity, 5).length).toEqual(20)
  })

  // Saving is the one place a reader says "keep this". A tidy-up that throws
  // one away because it had also been read is losing the thing it was told
  // to hold on to.
  test('keeps a saved entry that was also read, past the cap', () => {
    const saved = add('f1', 0, { read: true, saved: true })

    for (let n = 1; n < 20; n++) add('f1', n, { read: true })

    expect(queries.entriesWorthKeepingForIdentity(identity, 5).map((e) => e.id)).toContain(saved)
  })

  // The number itself, so a roll up cannot quietly become a different
  // decision than the one that was argued for.
  test('keeps fifteen read entries a feed when it is not told otherwise', () => {
    for (let n = 0; n < 40; n++) add('f1', n, { read: true })

    expect(queries.entriesWorthKeepingForIdentity(identity).filter((e) => e.feedId === 'f1').length).toEqual(15)
  })

  test('leaves the ordinary list of entries alone', () => {
    for (let n = 0; n < 40; n++) add('f1', n, { read: true })

    expect(queries.entriesForIdentity(identity).length).toEqual(40)
  })
})
