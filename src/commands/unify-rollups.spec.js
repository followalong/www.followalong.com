import { describe, test, expect, beforeEach } from 'vitest'
import MultiEventStore from '../state/multi-event-store.js'
import runners from '../state/runners.js'
import Queries from '../queries/index.js'
import Commands from './index.js'

const V = 'v2.3'
const ID = 'me'

const feed = (n) => ({ id: `f${n}`, url: `https://a${n}.example/feed`, createdAt: 1000 + n, data: { title: `Feed ${n}` } })
const entryOf = (n, extra = {}) => Object.assign({ id: `e${n}`, feedId: `f${n}`, createdAt: 2000 + n, data: { guid: `g${n}`, title: `Entry ${n}` } }, extra)

const rollup = (time, feeds, entries) => `${time}/identities/${ID}/rollup/${V} ${JSON.stringify({
  identity: { id: ID, name: 'Me', createdAt: 900 },
  feeds,
  entries,
  signals: [],
  addons: []
})}`

// Two snapshots, one of them arrived in a merge. Between them they hold
// things neither holds alone - one reader's older rollup has 131 feeds that
// are in no other event anywhere - so keeping the newer and dropping the
// older loses a feed list.
describe('two rollups in one log', () => {
  let state, queries, commands

  const identity = { id: ID }

  const load = async (lines) => {
    state = new MultiEventStore(`unify-${Math.random()}`, V, runners)

    await state.clear()
    state.createDB(ID, {})
    await state.importRaw(ID, lines.join('\n'))

    queries = new Queries({ state })
    commands = new Commands({ state, queries, keychain: { getKey: () => Promise.resolve('') } })
    commands.debouncedSyncIdentity = () => {}
  }

  const rollups = () => state.findAllEvents(ID).filter((e) => e.collection === 'identities' && e.action === 'rollup')
  const titles = () => queries.feedsForIdentity(identity).map((f) => f.data.title).sort()

  beforeEach(async () => {
    await load([
      rollup(4000, [feed(1), feed(2)], [entryOf(1)]),
      rollup(8000, [feed(2), feed(3)], [entryOf(2), entryOf(3)])
    ])
  })

  test('are two until they are unified', () => {
    expect(rollups()).toHaveLength(2)
  })

  test('become one', () => {
    commands.unifyRollupsForIdentity(identity)

    expect(rollups()).toHaveLength(1)
  })

  test('lose nothing that was only in the older one', () => {
    expect(titles()).toEqual(['Feed 1', 'Feed 2', 'Feed 3'])

    commands.unifyRollupsForIdentity(identity)

    expect(titles()).toEqual(['Feed 1', 'Feed 2', 'Feed 3'])
    expect(queries.entriesForIdentity(identity)).toHaveLength(3)
  })

  // The one that survives has to hold everything itself, because the others
  // are gone and nothing else carries those objects.
  test('leave one snapshot that holds all of it', () => {
    commands.unifyRollupsForIdentity(identity)

    const surviving = rollups()[0]

    expect(surviving.data.feeds.map((f) => f.id).sort()).toEqual(['f1', 'f2', 'f3'])
    expect(surviving.data.entries.map((e) => e.id).sort()).toEqual(['e1', 'e2', 'e3'])
  })

  test('still say the same thing after a reload', async () => {
    commands.unifyRollupsForIdentity(identity)

    await new Promise((resolve) => setTimeout(resolve, 0))

    const booted = new MultiEventStore(state._name, V, runners)

    await booted.restore()

    const q = new Queries({ state: booted })

    expect(q.feedsForIdentity(identity).map((f) => f.data.title).sort()).toEqual(['Feed 1', 'Feed 2', 'Feed 3'])
    expect(q.entriesForIdentity(identity)).toHaveLength(3)
  })

  test('do nothing the second time', () => {
    commands.unifyRollupsForIdentity(identity)

    const events = state.findAllEvents(ID).length

    commands.unifyRollupsForIdentity(identity)

    expect(state.findAllEvents(ID).length).toEqual(events)
  })

  // Unifying is not the moment to decide what to throw away. The snapshots
  // being replaced are the only copy of what they hold.
  test('do not apply the retention cap while standing in for each other', async () => {
    const many = []

    for (let n = 0; n < 40; n++) many.push(entryOf(100 + n, { feedId: 'f1', readAt: 9000 + n }))

    await load([rollup(4000, [feed(1)], many), rollup(8000, [feed(1)], [])])

    commands.unifyRollupsForIdentity(identity)

    expect(rollups()[0].data.entries).toHaveLength(40)
  })
})

describe('one rollup in a log', () => {
  test('is left exactly where it is', async () => {
    const state = new MultiEventStore(`unify-one-${Math.random()}`, V, runners)

    await state.clear()
    state.createDB(ID, {})
    await state.importRaw(ID, rollup(4000, [feed(1)], [entryOf(1)]))

    const queries = new Queries({ state })
    const commands = new Commands({ state, queries, keychain: { getKey: () => Promise.resolve('') } })
    commands.debouncedSyncIdentity = () => {}

    const before = state.findAllEvents(ID).map((e) => e.key)

    commands.unifyRollupsForIdentity({ id: ID })

    expect(state.findAllEvents(ID).map((e) => e.key)).toEqual(before)
  })
})
