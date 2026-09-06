import { describe, test, expect, beforeEach } from 'vitest'
import MultiEventStore from '../state/multi-event-store.js'
import runners from '../state/runners.js'
import Queries from '../queries/index.js'
import Commands from './index.js'

const V = 'v2.3'
const ITEM = (n) => `<item><title>Item ${n}</title><guid>https://a.example/${n}</guid></item>`
const FEED = (items) => `<rss><channel><title>A</title>${items}</channel></rss>`

// Two devices polling the same feed each created the article, each with an id
// of its own, and the merge kept both. One real log had 91 of these.
const device = async (label) => {
  const state = new MultiEventStore(`dupes-${label}-${Math.random()}`, V, runners)

  await state.clear()

  const identity = { id: state.createDB('shared-identity', {}) }
  let body = ''
  const fetch = () => Promise.resolve({ status: 200, body })
  const queries = new Queries({ state, fetch })
  const commands = new Commands({ state, queries, fetch, keychain: { getKey: () => Promise.resolve('') } })

  commands.debouncedSyncIdentity = () => {}

  state.track(identity.id, 'identities', identity.id, 'create', { name: 'Me' })
  // The same feed id on both, which is what a handed-over identity gives them.
  state.track(identity.id, 'feeds', 'f1', 'create', { url: 'https://a.example/feed', data: { title: 'A' } })

  return {
    state,
    queries,
    commands,
    identity,
    feed: () => queries.feedForIdentity(identity, 'f1'),
    poll: (items) => { body = FEED(items); return commands.fetchFeed(identity, queries.feedForIdentity(identity, 'f1')) },
    file: () => queries.eventsToFile(identity),
    merge: (text) => state.importRaw(identity.id, text),
    entries: () => queries.entriesForFeed(identity, queries.feedForIdentity(identity, 'f1')),
    titles: () => queries.entriesForFeed(identity, queries.feedForIdentity(identity, 'f1')).map((e) => queries.titleForEntry(e))
  }
}

describe('the same article arriving on two devices', () => {
  test('is one entry after they have seen each other', async () => {
    const one = await device('one')
    const two = await device('two')

    await one.poll(ITEM(1))
    await two.poll(ITEM(1))

    await one.merge(two.file())
    await two.merge(one.file())

    expect(one.titles()).toEqual(['Item 1'])
    expect(two.titles()).toEqual(['Item 1'])
  })

  test('carries what either device did to it', async () => {
    const one = await device('one')
    const two = await device('two')

    await one.poll(ITEM(1))
    await two.poll(ITEM(1))

    one.commands.markEntryAsReadForIdentity(one.identity, one.entries()[0])
    two.commands.saveEntryForIdentity(two.identity, two.entries()[0])

    await one.merge(two.file())

    expect(one.entries()).toHaveLength(1)
    expect(one.queries.isEntryRead(one.entries()[0])).toEqual(true)
    expect(one.queries.isEntrySaved(one.entries()[0])).toEqual(true)
  })

  // The lookup is by feed and key, never by id, so an entry stored before any
  // of this keeps the id it has and is found as it always was.
  test('leaves an entry that is already stored where it is', async () => {
    const one = await device('one')

    one.state.track(one.identity.id, 'entries', 'an-old-random-id', 'create', { feedId: 'f1', data: { guid: 'https://a.example/1', title: 'Item 1' } })

    await one.poll(ITEM(1))

    expect(one.entries()).toHaveLength(1)
    expect(one.entries()[0].id).toEqual('an-old-random-id')
  })
})

describe('duplicates that are already stored', () => {
  let app

  beforeEach(async () => {
    app = await device('cleanup')

    // Two copies of one article, as a merge of two devices left them.
    app.state.track(app.identity.id, 'entries', 'aaa-first', 'create', { feedId: 'f1', data: { guid: 'https://a.example/1', title: 'Item 1' } })
    app.state.track(app.identity.id, 'entries', 'zzz-second', 'create', { feedId: 'f1', data: { guid: 'https://a.example/1', title: 'Item 1' } })
    app.state.track(app.identity.id, 'entries', 'ccc-other', 'create', { feedId: 'f1', data: { guid: 'https://a.example/2', title: 'Item 2' } })
  })

  const live = () => app.entries()

  test('are two entries until something is done about it', () => {
    expect(live().filter((e) => app.queries.titleForEntry(e) === 'Item 1')).toHaveLength(2)
  })

  test('become one', () => {
    app.commands.mergeDuplicateEntriesForIdentity(app.identity)

    expect(live().filter((e) => app.queries.titleForEntry(e) === 'Item 1')).toHaveLength(1)
    expect(live()).toHaveLength(2)
  })

  // Whichever copy survives has to be the same one on every device, or two
  // devices delete each other's survivor and the article is gone from both.
  test('keep the same one whichever device does it', () => {
    app.commands.mergeDuplicateEntriesForIdentity(app.identity)

    expect(live().find((e) => app.queries.titleForEntry(e) === 'Item 1').id).toEqual('aaa-first')
  })

  test('bring what was done to either copy with them', () => {
    const loser = app.queries.entryForIdentity(app.identity, 'zzz-second')

    app.commands.markEntryAsReadForIdentity(app.identity, loser)
    app.commands.saveEntryForIdentity(app.identity, loser)

    app.commands.mergeDuplicateEntriesForIdentity(app.identity)

    const survivor = live().find((e) => app.queries.titleForEntry(e) === 'Item 1')

    expect(survivor.id).toEqual('aaa-first')
    expect(app.queries.isEntryRead(survivor)).toEqual(true)
    expect(app.queries.isEntrySaved(survivor)).toEqual(true)
  })

  test('does not run twice on the same device', () => {
    app.commands.mergeDuplicateEntriesForIdentity(app.identity)

    const events = app.state.findAllEvents(app.identity.id).length

    app.commands.mergeDuplicateEntriesForIdentity(app.identity)

    expect(app.state.findAllEvents(app.identity.id).length).toEqual(events)
  })

  // The copy that lost is deleted, and a lookup that found the deleted one
  // would decide the article is missing and store it again.
  test('does not let the next poll put the duplicate back', async () => {
    app.commands.mergeDuplicateEntriesForIdentity(app.identity)

    await app.poll(ITEM(1) + ITEM(2))

    expect(live().filter((e) => app.queries.titleForEntry(e) === 'Item 1')).toHaveLength(1)
  })
})
