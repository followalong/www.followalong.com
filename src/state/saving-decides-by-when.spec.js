import { describe, test, expect } from 'vitest'
import MultiEventStore from './multi-event-store.js'
import runners from './runners.js'
import Queries from '../queries/index.js'

const V = 'v2.3'
const ID = 'me'
const identity = { id: ID }

// Saving is a decision a reader made at a moment, and the log is not folded
// in the order those moments happened: a rollup folds ahead of everything,
// and a merge brings events written before the snapshot they land on. So a
// save says when it was decided, and an older decision cannot undo a newer
// one however late it arrives.
const save = (time, at) => `${time}/entries/e1/save/${V} ${at ? JSON.stringify({ at }) : '{}'}`
const unsave = (time, at) => `${time}/entries/e1/unsave/${V} ${at ? JSON.stringify({ at }) : '{}'}`
const create = (time) => `${time}/entries/e1/create/${V} ${JSON.stringify({ feedId: 'f1', data: { guid: 'g1', title: 'An entry' } })}`

const load = async (lines) => {
  const state = new MultiEventStore(`saving-${Math.random()}`, V, runners)

  await state.clear()
  state.createDB(ID, {})
  await state.importRaw(ID, lines.join('\n'))

  const queries = new Queries({ state })

  return { state, queries, entry: () => queries.entryForIdentity(identity, 'e1'), saved: () => queries.isEntrySaved(queries.entryForIdentity(identity, 'e1')) }
}

describe('a save and an unsave arriving out of order', () => {
  test('the newer save wins however late the unsave arrives', async () => {
    const app = await load([create(100), save(9000, 9000), unsave(1000, 1000)])

    expect(app.saved()).toEqual(true)
  })

  test('the newer unsave wins however late the save arrives', async () => {
    const app = await load([create(100), unsave(9000, 9000), save(1000, 1000)])

    expect(app.saved()).toEqual(false)
  })

  test('the answer does not depend on which was folded first', async () => {
    const one = await load([create(100), save(5000, 5000), unsave(9000, 9000)])
    const other = await load([create(100), unsave(9000, 9000), save(5000, 5000)])

    expect(one.saved()).toEqual(false)
    expect(other.saved()).toEqual(false)
  })
})

// 113 of these are already in one reader's log.
describe('events written before any of this', () => {
  test('still say what they always said', async () => {
    const app = await load([create(100), save(5000)])

    expect(app.saved()).toEqual(true)
    expect(app.entry().savedAt).toEqual(5000)
  })

  test('an unsave with nothing in it still unsaves', async () => {
    const app = await load([create(100), save(5000), unsave(9000)])

    expect(app.saved()).toEqual(false)
  })

  // The moment it was tracked is the best answer an old event has, and it is
  // the answer the fold always used. It does not get to win for lacking one.
  test('do not beat a newer decision by having no moment of their own', async () => {
    const app = await load([create(100), save(9000, 9000), unsave(1000)])

    expect(app.saved()).toEqual(true)
  })

  test('and still lose to one that is genuinely newer', async () => {
    const app = await load([create(100), save(1000, 1000), unsave(9000)])

    expect(app.saved()).toEqual(false)
  })
})

// The case that would have caught the original bug: a rollup folds ahead of
// everything, so every event older than it lands on top of the snapshot.
describe('through a roll up', () => {
  const rollup = (time, entry) => `${time}/identities/${ID}/rollup/${V} ${JSON.stringify({
    identity: { id: ID, name: 'Me', createdAt: 900 },
    feeds: [{ id: 'f1', url: 'https://a.example/feed', createdAt: 100, data: { title: 'A feed' } }],
    entries: [entry],
    signals: [],
    addons: []
  })}`

  test('a save survives a stale unsave landing on the snapshot', async () => {
    const app = await load([
      rollup(8000, { id: 'e1', feedId: 'f1', createdAt: 100, savedAt: 5000, data: { guid: 'g1', title: 'An entry' } }),
      unsave(1000, 1000)
    ])

    expect(app.saved()).toEqual(true)
  })

  test('an unsave survives a stale save landing on the snapshot', async () => {
    const app = await load([
      rollup(8000, { id: 'e1', feedId: 'f1', createdAt: 100, unsavedAt: 5000, data: { guid: 'g1', title: 'An entry' } }),
      save(1000, 1000)
    ])

    expect(app.saved()).toEqual(false)
  })

  // Whatever the entry records has to be in the snapshot, or the next fold
  // has nothing to compare against and the stale event wins again.
  test('what the entry decided is carried in the snapshot', async () => {
    const app = await load([create(100), unsave(5000, 5000)])
    const entry = app.entry()

    expect(entry.unsavedAt).toEqual(5000)

    const rolled = await load([rollup(8000, JSON.parse(JSON.stringify(entry))), save(1000, 1000)])

    expect(rolled.saved()).toEqual(false)
  })
})

describe('with only the newest of each kept', () => {
  test('the log holds one of each and still reaches the right answer', async () => {
    const app = await load([
      create(100),
      save(2000, 2000), save(4000, 4000), save(6000, 6000),
      unsave(3000, 3000), unsave(5000, 5000)
    ])

    const kept = app.state.findAllEvents(ID)

    expect(kept.filter((e) => e.action === 'save')).toHaveLength(1)
    expect(kept.filter((e) => e.action === 'unsave')).toHaveLength(1)
    expect(app.saved()).toEqual(true)
  })
})
