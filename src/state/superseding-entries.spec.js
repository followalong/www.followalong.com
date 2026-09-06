import { describe, test, expect, beforeEach } from 'vitest'
import MultiEventStore from './multi-event-store.js'
import runners from './runners.js'
import Queries from '../queries/index.js'

// Marking one entry read and unread again wrote an event every time, and kept
// every one of them for good. Only the latest of each action decides anything,
// so the rest is a record of somebody changing their mind.
describe('reading and saving the same entry over and over', () => {
  let state, queries, identity, name, clock

  const ENTRY = 'e1'

  beforeEach(async () => {
    name = `superseding-${Math.random()}`
    state = new MultiEventStore(name, 'v2.3', runners)
    await state.clear()
    identity = { id: state.createDB(null, {}) }
    queries = new Queries({ state })

    state.track(identity.id, 'identities', identity.id, 'create', { name: 'Me' })
    state.track(identity.id, 'feeds', 'f1', 'create', { url: 'https://a.example/feed', data: { title: 'A' } })
    state.track(identity.id, 'entries', ENTRY, 'create', { feedId: 'f1', data: { guid: 'g1', title: 'One' } })

    // Above everything already in the log. A time is the replay order, not a
    // label, so an event stamped before the create it depends on folds
    // against an object that does not exist yet.
    clock = Date.now() + 1000
  })

  const entry = () => queries.entryForIdentity(identity, ENTRY)
  const count = (action) => state.findAllEvents(identity.id).filter((e) => e.action === action).length

  // A re-fold is where superseding has to prove itself: the live projection
  // was updated as each event was tracked, and only a reload replays what the
  // log actually still holds.
  const reloaded = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))

    const booted = new MultiEventStore(name, 'v2.3', runners)

    await booted.restore()

    return new Queries({ state: booted }).entryForIdentity(identity, ENTRY)
  }

  test('keeps one markRead however often it is marked read', () => {
    for (let i = 0; i < 20; i++) {
      state.track(identity.id, 'entries', ENTRY, 'markRead', {})
    }

    expect(count('markRead')).toEqual(1)
  })

  test('keeps one of each while it is toggled', () => {
    for (let i = 0; i < 20; i++) {
      state.track(identity.id, 'entries', ENTRY, 'markRead', {})
      state.track(identity.id, 'entries', ENTRY, 'markUnread', {})
    }

    expect(count('markRead')).toEqual(1)
    expect(count('markUnread')).toEqual(1)
  })

  test('is still read after a reload when read came last', async () => {
    state.track(identity.id, 'entries', ENTRY, 'markUnread', {}, clock++)
    state.track(identity.id, 'entries', ENTRY, 'markRead', {}, clock++)

    expect(queries.isEntryRead(entry())).toEqual(true)
    expect(queries.isEntryRead(await reloaded())).toEqual(true)
  })

  test('is still unread after a reload when unread came last', async () => {
    state.track(identity.id, 'entries', ENTRY, 'markRead', {}, clock++)
    state.track(identity.id, 'entries', ENTRY, 'markUnread', {}, clock++)

    expect(queries.isEntryRead(entry())).toEqual(false)
    expect(queries.isEntryRead(await reloaded())).toEqual(false)
  })

  test('survives a long argument with itself', async () => {
    for (let i = 0; i < 20; i++) {
      state.track(identity.id, 'entries', ENTRY, 'markRead', {}, clock++)
      state.track(identity.id, 'entries', ENTRY, 'markUnread', {}, clock++)
    }

    state.track(identity.id, 'entries', ENTRY, 'markRead', {}, clock++)

    expect(queries.isEntryRead(await reloaded())).toEqual(true)
  })

  test('does the same for saving', async () => {
    for (let i = 0; i < 20; i++) {
      state.track(identity.id, 'entries', ENTRY, 'save', {}, clock++)
      state.track(identity.id, 'entries', ENTRY, 'unsave', {}, clock++)
    }

    state.track(identity.id, 'entries', ENTRY, 'save', {}, clock++)

    expect(count('save')).toEqual(1)
    expect(count('unsave')).toEqual(1)
    expect(queries.isEntrySaved(await reloaded())).toEqual(true)
  })

  // Two entries changing their minds are two arguments, not one.
  test('keeps them apart per entry', () => {
    state.track(identity.id, 'entries', 'e2', 'create', { feedId: 'f1', data: { guid: 'g2', title: 'Two' } })
    state.track(identity.id, 'entries', ENTRY, 'markRead', {})
    state.track(identity.id, 'entries', 'e2', 'markRead', {})

    expect(count('markRead')).toEqual(2)
  })
})
