import { describe, test, expect, beforeEach } from 'vitest'
import MultiEventStore from '../state/multi-event-store.js'
import runners from '../state/runners.js'
import Queries from '../queries/index.js'
import Commands from './index.js'

// A feed's own record is its title, its icon, its validators. The articles
// are a collection of their own, and storing them here as well put the whole
// document in the log a second time - up to 1.16MB an event, kept for good.
describe('what a feed stores about itself', () => {
  let state, queries, commands, identity, respond

  const ITEM = (n) => `<item><title>Item ${n}</title><guid>https://a.example/${n}</guid><description>${'x'.repeat(500)}</description></item>`

  // Items where the plain unwrapping does not reach them. RDF feeds put the
  // channel and the items side by side under rdf:RDF.
  const RDF = (items) => `<rdf:RDF><channel><title>A channel</title><image><url>https://a.example/icon.png</url></image></channel>${items}</rdf:RDF>`
  const RSS = (items) => `<rss><channel><title>A channel</title><image><url>https://a.example/icon.png</url></image>${items}</channel></rss>`

  beforeEach(async () => {
    respond = () => Promise.resolve({ status: 200, body: '' })

    const fetch = (url, options) => respond(url, options)

    state = new MultiEventStore(`feed-doc-${Math.random()}`, 'v2.3', runners)
    await state.clear()
    identity = { id: state.createDB(null, {}) }
    queries = new Queries({ state, fetch })
    commands = new Commands({ state, queries, fetch })

    state.track(identity.id, 'feeds', 'f1', 'create', { url: 'https://a.example/feed', data: { title: 'A' } })
  })

  const reload = () => queries.feedForIdentity(identity, 'f1')
  const poll = (body) => {
    respond = () => Promise.resolve({ status: 200, body })

    return commands.fetchFeed(identity, reload())
  }
  const updates = () => state.findAllEvents(identity.id).filter((e) => e.collection === 'feeds' && e.action === 'update')

  // Two events tracked in the same millisecond share a key and are one event,
  // which would hide whether anything is being superseded.
  const tick = () => new Promise((resolve) => setTimeout(resolve, 2))
  const stored = () => JSON.stringify(updates().map((e) => e.data))

  test('keeps the items out of a plain feed document', async () => {
    await poll(RSS(ITEM(1) + ITEM(2)))

    expect(stored()).not.toContain('Item 1')
    expect(queries.entriesForFeed(identity, reload()).length).toEqual(2)
  })

  // The unwrapping only reaches the top level, so a document that nests its
  // items anywhere else stored every one of them on the feed.
  test('keeps them out however deeply they are nested', async () => {
    await poll(RDF(ITEM(1) + ITEM(2)))

    expect(stored()).not.toContain('Item 1')
    expect(stored()).not.toContain('xxxxx')
  })

  test('still keeps what the feed record is for', async () => {
    await poll(RSS(ITEM(1)))

    expect(queries.titleForFeed(reload())).toEqual('A channel')
    expect(queries.imageForFeed(reload())).toEqual('https://a.example/icon.png')
  })

  // Every update carries the whole document, so the one before it can decide
  // nothing that the latest does not decide again.
  test('keeps one update however often the feed changes', async () => {
    await poll(RSS(ITEM(1)).replace('A channel', 'Name one'))
    await tick()
    await poll(RSS(ITEM(1)).replace('A channel', 'Name two'))
    await tick()
    await poll(RSS(ITEM(1)).replace('A channel', 'Name three'))

    expect(updates().length).toEqual(1)
  })

  test('the surviving update is the newest one', async () => {
    await poll(RSS(ITEM(1)).replace('A channel', 'Name one'))
    await tick()
    await poll(RSS(ITEM(1)).replace('A channel', 'Name three'))

    expect(queries.titleForFeed(reload())).toEqual('Name three')
  })
})

describe('a feed record stored before items were stripped', () => {
  let state, queries, commands, identity, respond

  const ITEM = (n) => `<item><title>Item ${n}</title><guid>https://a.example/${n}</guid><description>${'x'.repeat(500)}</description></item>`
  const RSS = (items) => `<rss><channel><title>A channel</title>${items}</channel></rss>`

  beforeEach(async () => {
    respond = () => Promise.resolve({ status: 200, body: '' })

    const fetch = (url, options) => respond(url, options)

    state = new MultiEventStore(`feed-fat-${Math.random()}`, 'v2.3', runners)
    await state.clear()
    identity = { id: state.createDB(null, {}) }
    queries = new Queries({ state, fetch })
    commands = new Commands({ state, queries, fetch })

    // A record as it was stored before the items were kept out of it.
    state.track(identity.id, 'feeds', 'f1', 'create', {
      url: 'https://a.example/feed',
      data: { title: 'A channel', item: [{ title: 'Item 1', description: 'x'.repeat(500) }] }
    })
  })

  const reload = () => queries.feedForIdentity(identity, 'f1')
  const poll = (body) => {
    respond = () => Promise.resolve({ status: 200, body })

    return commands.fetchFeed(identity, reload())
  }

  // Nothing rewrites a fat record on its own: the document we would store has
  // strictly less in it, so it never reads as a change. Without a reason of
  // its own, a feed followed before the strip keeps its articles in the log
  // for good, which is most of what a large log is made of.
  test('is rewritten without them on the next poll, changed or not', async () => {
    expect(commands.carriesItems(reload().data)).toEqual(true)

    await poll(RSS(ITEM(1)))

    expect(commands.carriesItems(reload().data)).toEqual(false)
    expect(queries.titleForFeed(reload())).toEqual('A channel')
  })

  test('is left alone once it carries none', async () => {
    await poll(RSS(ITEM(1)))

    const after = state.findAllEvents(identity.id).length

    await poll(RSS(ITEM(1)))

    expect(state.findAllEvents(identity.id).length).toEqual(after)
  })
})
