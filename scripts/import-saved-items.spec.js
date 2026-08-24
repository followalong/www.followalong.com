import fs from 'fs'
import path from 'path'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import MultiEventStore from '../src/state/multi-event-store.js'
import runners from '../src/state/runners.js'
import Queries from '../src/queries/index.js'
import Commands from '../src/commands/index.js'

// The script is run as text, exactly as it is pasted into a console, so what
// is under test is the thing that will touch a real log rather than a copy of
// its logic that could drift from it.
const SOURCE = fs.readFileSync(path.join(__dirname, 'import-saved-items.js'), 'utf8')

const load = () => {
  const scope = {}

  // eslint-disable-next-line no-new-func
  new Function('window', 'document', 'console', SOURCE)(scope, undefined, { log: () => {}, error: () => {} })

  return scope.importFollowAlongSaved
}

// Shaped like the old app's "Download Identity" file: every feed, every item
// it held, and a savedAt on the handful that were saved.
const OLD = {
  exportedAt: 20000,
  identities: [{
    id: 'old',
    name: 'My Account',
    feeds: [
      { id: 'fa', name: 'Already Here', url: 'https://already.example/rss', updatedAt: 1000 },
      { id: 'fb', name: 'Long Gone', url: 'https://gone.example/rss', updatedAt: 1100 },
      { id: 'fc', name: 'No URL At All' }
    ],
    items: [
      // already here, keyed by its link because its guid parsed to an object
      { id: 'i1', guid: 'https://ia.net/?p=1', link: 'https://ia.net/topics/known', feedUrl: 'https://already.example/rss', title: 'Known', savedAt: 5000, readAt: 5000 },
      // saved, from a feed this device no longer follows
      { id: 'i2', guid: 'https://gone.example/a', link: 'https://gone.example/a', feedUrl: 'https://gone.example/rss', title: 'Gone A', savedAt: 6000, content: '<p>body</p>' },
      // saved long before the entry this import has to create for it
      { id: 'i3', guid: 'https://already.example/c', link: 'https://already.example/c', feedUrl: 'https://already.example/rss', title: 'Old Save', savedAt: 5 },
      // read but never saved: not ours to bring
      { id: 'i4', guid: 'https://already.example/d', link: 'https://already.example/d', feedUrl: 'https://already.example/rss', title: 'Merely Read', readAt: 7000 },
      // saved, and there is no feed anywhere to hang it on
      { id: 'i5', guid: 'https://nowhere.example/x', feedUrl: 'https://nowhere.example/rss', title: 'Orphan', savedAt: 7000 }
    ]
  }]
}

describe('the console script that brings saved items back', () => {
  let importSaved, state, queries, commands, app

  beforeEach(async () => {
    importSaved = load()
    state = new MultiEventStore(`script-${Math.random()}`, 'v2.3', runners)
    await state.clear()

    const identity = { id: state.createDB(null, {}) }

    queries = new Queries({ state })
    commands = new Commands({ state, queries, keychain: { getKey: () => Promise.reject(new Error('none')) } })
    app = { identity, queries, commands }

    state.track(identity.id, 'feeds', 'existing', 'create', { url: 'https://already.example/rss', data: { title: 'Already Here' } }, 10)
    state.track(identity.id, 'entries', 'existing-1', 'create', {
      feedId: 'existing',
      data: { guid: { '#text': 'https://ia.net/?p=1' }, link: 'https://ia.net/topics/known', title: 'Known' }
    }, 20)
  })

  test('brings back every saved item and nothing else', () => {
    importSaved(app, OLD)

    const saved = queries.savedEntriesForIdentity(app.identity)
      .map((entry) => queries.titleForEntry(entry))
      .sort()

    expect(saved).toEqual(['Gone A', 'Known', 'Old Save', 'Orphan'])
  })

  test('leaves an item that was only read behind', () => {
    importSaved(app, OLD)

    const titles = queries.entriesForIdentity(app.identity).map((entry) => queries.titleForEntry(entry))

    expect(titles).not.toContain('Merely Read')
  })

  test('marks nothing read', () => {
    importSaved(app, OLD)

    expect(queries.entriesForIdentity(app.identity).filter((entry) => queries.isEntryRead(entry))).toEqual([])
  })

  test('saves onto the entry already here rather than making a second one', () => {
    const report = importSaved(app, OLD)

    expect(report.matched).toEqual(1)
    expect(queries.entriesForIdentity(app.identity).filter((e) => queries.titleForEntry(e) === 'Known').length).toEqual(1)
  })

  test('adds only the feeds a saved item needs, and adds them paused', () => {
    const report = importSaved(app, OLD)

    expect(report.feeds).toEqual(1)

    const feeds = queries.feedsForIdentity(app.identity)

    expect(feeds.map((feed) => queries.titleForFeed(feed)).sort()).toEqual(['Already Here', 'Long Gone'])
    expect(queries.isFeedPaused(feeds.find((f) => queries.titleForFeed(f) === 'Long Gone'))).toBe(true)
  })

  test('keeps a save whose feed is nowhere to be found', () => {
    importSaved(app, OLD)

    expect(queries.savedEntriesForIdentity(app.identity).some((e) => queries.titleForEntry(e) === 'Orphan')).toBe(true)
  })

  test('gives the identity somewhere to see them', () => {
    importSaved(app, OLD)

    expect(queries.signalForIdentity(app.identity, 'saved')).toBeTruthy()
  })

  test('holds on to the saves through a reload', async () => {
    importSaved(app, OLD)

    const reloaded = new MultiEventStore(state._name, 'v2.3', runners)
    await reloaded.restore()

    const q = new Queries({ state: reloaded })

    expect(q.savedEntriesForIdentity(app.identity).length).toEqual(4)
  })

  test('running it twice changes nothing the second time', () => {
    importSaved(app, OLD)

    const entries = queries.entriesForIdentity(app.identity).length
    const second = importSaved(app, OLD)

    expect(second.saved).toEqual(0)
    expect(second.created).toEqual(0)
    expect(second.feeds).toEqual(0)
    expect(second.alreadySaved).toEqual(4)
    expect(queries.entriesForIdentity(app.identity).length).toEqual(entries)
  })

  // After a roll up the whole log is one identities.rollup event stamped now,
  // and replay sorts by time. A save carrying its original savedAt sorts ahead
  // of the event that introduces the entry, so the runner finds nothing to
  // stamp and the save is dropped on the next reload — silently.
  test('survives a reload of an identity that has been rolled up', async () => {
    await commands.createProjectionForIdentity(app.identity)

    const report = importSaved(app, OLD)

    expect(report.saved).toEqual(4)

    const reloaded = new MultiEventStore(state._name, 'v2.3', runners)
    await reloaded.restore()

    const q = new Queries({ state: reloaded })

    expect(q.savedEntriesForIdentity(app.identity).map((e) => q.titleForEntry(e)).sort())
      .toEqual(['Gone A', 'Known', 'Old Save', 'Orphan'])
  })

  test('takes a file that is one identity rather than a list of them', () => {
    expect(importSaved(app, OLD.identities[0]).saved).toEqual(4)
  })

  test('refuses a file that is not from the old app', () => {
    expect(() => importSaved(app, { nope: true })).toThrow(/does not look like/)
  })

  test('touches nothing when there is no app on the page', () => {
    const error = vi.fn()

    // eslint-disable-next-line no-new-func
    new Function('window', 'document', 'console', SOURCE)(
      {},
      { querySelector: () => null, createElement: () => ({ click: () => { throw new Error('picked a file') } }) },
      { log: () => {}, error }
    )

    expect(error).toHaveBeenCalled()
  })
})
