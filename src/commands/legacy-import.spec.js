import { describe, test, expect, beforeEach } from 'vitest'
import MultiEventStore from '../state/multi-event-store.js'
import runners from '../state/runners.js'
import Queries from '../queries/index.js'
import Commands from './index.js'

// Shaped like the old app's "Download Identity" file: every feed, and only the
// items it considers saved.
const LEGACY = {
  id: 'old',
  name: 'My Account',
  feeds: [
    { id: 'fa', name: 'Already Here', url: 'https://already.example/rss', updatedAt: 1000 },
    { id: 'fb', name: 'Missing One', url: 'https://missing.example/rss', updatedAt: 1100 },
    { id: 'fc', name: 'Paused', url: 'https://paused.example/rss', updatedAt: 1200, pausedAt: 1300 },
    { id: 'fd', name: 'No URL At All' }
  ],
  items: [
    // already here, keyed by its link because its guid parsed to an object
    { id: 'i1', guid: 'https://ia.net/?p=1', link: 'https://ia.net/topics/known', feedUrl: 'https://already.example/rss', title: 'Known', pubDate: 'Mon, 01 May 2023 00:00:00 GMT', savedAt: 5000, updatedAt: 2000 },
    { id: 'i2', guid: 'https://missing.example/a', link: 'https://missing.example/a', feedUrl: 'https://missing.example/rss', title: 'Missing A', pubDate: 'Tue, 02 May 2023 00:00:00 GMT', savedAt: 6000, updatedAt: 2100, content: '<p>body</p>' },
    // saved long before the entry this import creates for it
    { id: 'i3', guid: 'https://paused.example/c', link: 'https://paused.example/c', feedUrl: 'https://paused.example/rss', title: 'Old Save', pubDate: 'Thu, 04 May 2023 00:00:00 GMT', savedAt: 5, updatedAt: 9000 },
    { id: 'i4', guid: 'https://gone.example/x', feedUrl: 'https://gone.example/rss', title: 'Orphan', savedAt: 7000 }
  ]
}

describe('importing an old followalong.net identity', () => {
  let state, queries, commands, identity

  beforeEach(async () => {
    state = new MultiEventStore(`legacy-${Math.random()}`, 'v2.3', runners)
    await state.clear()
    identity = { id: state.createDB(null, {}) }
    queries = new Queries({ state })
    commands = new Commands({ state, queries, keychain: { getKey: () => Promise.reject(new Error('none')) } })

    // what is already here
    state.track(identity.id, 'feeds', 'existing', 'create', { url: 'https://already.example/rss', data: { title: 'Already Here' } }, 10)
    state.track(identity.id, 'entries', 'existing-1', 'create', {
      feedId: 'existing',
      data: { guid: { '#text': 'https://ia.net/?p=1' }, link: 'https://ia.net/topics/known', title: 'Known' }
    }, 20)
  })

  test('reuses a feed it already has rather than making a second one', () => {
    const report = commands.importLegacyIdentity(identity, LEGACY)

    expect(report.feedsReused).toEqual(1)
    expect(report.feedsCreated).toEqual(2)
    expect(report.feedsSkipped).toEqual(1)
    expect(queries.feedsForIdentity(identity).length).toEqual(3)
  })

  test('matches an entry already here even when the keys differ', () => {
    const report = commands.importLegacyIdentity(identity, LEGACY)

    expect(report.entriesExisting).toEqual(1)
    expect(report.entriesCreated).toEqual(2)
    expect(report.entriesSkipped).toEqual(1)
  })

  test('carries the saved state across', () => {
    commands.importLegacyIdentity(identity, LEGACY)

    const saved = queries.entriesForIdentity(identity)
      .filter((entry) => queries.isEntrySaved(entry))
      .map((entry) => queries.titleForEntry(entry))
      .sort()

    expect(saved).toEqual(['Known', 'Missing A', 'Old Save'])
  })

  test('keeps a paused feed paused', () => {
    commands.importLegacyIdentity(identity, LEGACY)

    const paused = queries.feedsForIdentity(identity).find((feed) => queries.titleForFeed(feed) === 'Paused')

    expect(queries.isFeedPaused(paused)).toBe(true)
  })

  test('holds on to the saved state through a reload', async () => {
    commands.importLegacyIdentity(identity, LEGACY)

    const reloaded = new MultiEventStore(state._name, 'v2.3', runners)
    await reloaded.restore()

    const q = new Queries({ state: reloaded })

    expect(q.entriesForIdentity(identity).filter((entry) => q.isEntrySaved(entry)).length).toEqual(3)
  })

  test('importing the same file twice changes nothing', () => {
    commands.importLegacyIdentity(identity, LEGACY)

    const feeds = queries.feedsForIdentity(identity).length
    const entries = queries.entriesForIdentity(identity).length
    const second = commands.importLegacyIdentity(identity, LEGACY)

    expect(second.feedsCreated).toEqual(0)
    expect(second.entriesCreated).toEqual(0)
    expect(second.saved).toEqual(0)
    expect(queries.feedsForIdentity(identity).length).toEqual(feeds)
    expect(queries.entriesForIdentity(identity).length).toEqual(entries)
  })

  test('refuses a file that is not an identity', () => {
    expect(() => commands.importLegacyIdentity(identity, { nope: true })).toThrow(/does not look like/)
  })
})
