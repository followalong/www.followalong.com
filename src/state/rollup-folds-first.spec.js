import { describe, test, expect } from 'vitest'
import MultiEventStore from './multi-event-store.js'
import runners from './runners.js'
import Queries from '../queries/index.js'

const V = 'v2.3'
const ID = 'me'

// A rollup is a snapshot of where everything had got to, not something that
// happened at a moment. Sorting it by its timestamp put it in the middle of
// the history it summarises: anything older than the roll up folded before
// the event that introduces the object it changes, found nothing there, and
// was dropped without a word. It folds first now, and the history applies on
// top of it.
const rollup = (time, extra = {}) => `${time}/identities/${ID}/rollup/${V} ${JSON.stringify(Object.assign({
  identity: { id: ID, name: 'Me', createdAt: 900 },
  feeds: [{ id: 'f1', url: 'https://a.example/feed', createdAt: 1100, data: { title: 'A feed' } }],
  entries: [{ id: 'e1', feedId: 'f1', createdAt: 1300, readAt: 4000, data: { guid: 'g1', title: 'An entry' } }],
  signals: [],
  addons: []
}, extra))}`

describe('where a rollup folds', () => {
  let state, queries

  const identity = { id: ID }

  const load = async (lines) => {
    state = new MultiEventStore(`fold-first-${Math.random()}`, V, runners)

    await state.clear()
    state.createDB(ID, {})
    await state.importRaw(ID, lines.join('\n'))

    queries = new Queries({ state })
  }

  const entry = () => queries.entryForIdentity(identity, 'e1')

  // The trap this closes: the save is older than the roll up, so it used to
  // sort ahead of the only event that introduces the entry.
  test('an older event still finds what the rollup brought', async () => {
    await load([rollup(5000), `1000/entries/e1/save/${V} {}`])

    expect(entry()).toBeTruthy()
    expect(queries.isEntrySaved(entry())).toEqual(true)
  })

  test('a newer event applies on top of it', async () => {
    await load([rollup(5000), `9000/entries/e1/markUnread/${V} {}`])

    expect(queries.isEntryRead(entry())).toEqual(false)
  })

  // The cost of the choice, stated rather than discovered: a stale event can
  // beat the snapshot. Losing sight of an article is worse than one flipping
  // back to unread, so this is the way round it fails.
  test('a stale event beats the snapshot, which is the trade', async () => {
    await load([rollup(5000), `1000/entries/e1/markUnread/${V} {}`])

    expect(queries.isEntryRead(entry())).toEqual(false)
  })

  test('everything else still folds in time order', async () => {
    await load([
      rollup(5000),
      `9000/entries/e1/markUnread/${V} {}`,
      `9500/entries/e1/markRead/${V} {}`
    ])

    expect(queries.isEntryRead(entry())).toEqual(true)
  })

  test('two rollups fold in their own order, both before the rest', async () => {
    await load([
      rollup(8000, { feeds: [{ id: 'f1', url: 'https://a.example/feed', createdAt: 1100, data: { title: 'Renamed later' } }] }),
      rollup(5000),
      `1/feeds/f1/update/${V} ${JSON.stringify({ data: { title: 'An update older than both' } })}`
    ])

    // The later rollup wins between the two, and the ordinary event that is
    // older than both still applies on top of them.
    expect(queries.titleForFeed(queries.feedForIdentity(identity, 'f1'))).toEqual('An update older than both')
  })

  test('a rollup carrying nothing does not bring the fold down', async () => {
    await load([`5000/identities/${ID}/rollup/${V} {}`, `1/identities/${ID}/create/${V} ${JSON.stringify({ name: 'Still here' })}`])

    expect(queries.allIdentities().map((one) => one.name)).toEqual(['Still here'])
  })

  test('a rollup with no entries or feeds is only an identity', async () => {
    await load([`5000/identities/${ID}/rollup/${V} ${JSON.stringify({ identity: { id: ID, name: 'Me', createdAt: 900 } })}`])

    expect(queries.allIdentities()).toHaveLength(1)
    expect(queries.feedsForIdentity(identity)).toHaveLength(0)
  })
})
