import { describe, test, expect } from 'vitest'
import MultiEventStore from '../state/multi-event-store.js'
import runners from '../state/runners.js'
import Queries from '../queries/index.js'
import Commands from './index.js'

const V = 'v2.3'
const URL = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCabc'

// One entry as YouTube writes it: an id, a videoId, an alternate link and a
// media group whose community counts change on every poll.
const VIDEO = (n, views = 1) => `
  <entry>
    <id>yt:video:vid${n}</id>
    <yt:videoId>vid${n}</yt:videoId>
    <yt:channelId>UCabc</yt:channelId>
    <title>Video ${n}</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=vid${n}"/>
    <author><name>Chan</name><uri>https://www.youtube.com/channel/UCabc</uri></author>
    <published>2024-01-0${n}T00:00:00+00:00</published>
    <updated>2024-01-0${n}T00:00:00+00:00</updated>
    <media:group>
      <media:title>Video ${n}</media:title>
      <media:content url="https://www.youtube.com/v/vid${n}?version=3" type="application/x-shockwave-flash" width="640" height="390"/>
      <media:thumbnail url="https://i2.ytimg.com/vi/vid${n}/hqdefault.jpg" width="480" height="360"/>
      <media:description>About video ${n}</media:description>
      <media:community>
        <media:starRating count="10" average="5.00" min="1" max="5"/>
        <media:statistics views="${views}"/>
      </media:community>
    </media:group>
  </entry>`

const FEED = (entries) => `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
  <link rel="self" href="${URL}"/>
  <id>yt:channel:UCabc</id>
  <yt:channelId>UCabc</yt:channelId>
  <title>Chan</title>
  <link rel="alternate" href="https://www.youtube.com/channel/UCabc"/>
  <author><name>Chan</name><uri>https://www.youtube.com/channel/UCabc</uri></author>
  <published>2020-01-01T00:00:00+00:00</published>
  ${entries}
</feed>`

const device = async (dbName = `yt-${Math.random()}`, { empty = false } = {}) => {
  const state = new MultiEventStore(dbName, V, runners)

  await state.clear()

  const identity = { id: empty ? null : state.createDB('shared-identity', {}) }

  let body = ''
  const fetch = (url) => Promise.resolve({ status: 200, body: /channel\//.test(url) ? '<html></html>' : body })
  const queries = new Queries({ state, fetch })
  const commands = new Commands({ state, queries, fetch, keychain: { getKey: () => Promise.resolve(''), addNone: () => {} } })

  commands.debouncedSyncIdentity = () => {}

  if (!empty) {
    state.track(identity.id, 'identities', identity.id, 'create', { name: 'Me' })
    state.track(identity.id, 'feeds', 'f1', 'create', { url: URL, data: { title: 'Chan' } })
  }

  const feed = () => queries.feedForIdentity(identity, 'f1')

  return {
    state,
    queries,
    commands,
    identity,
    feed,
    serve: (entries) => { body = FEED(entries) },
    poll: (entries) => { body = FEED(entries); return commands.fetchFeed(identity, feed()) },
    file: () => queries.eventsToFile(identity),
    merge: (text) => state.importRaw(identity.id, text),
    entries: () => queries.entriesForFeed(identity, feed()),
    titles: () => queries.entriesForFeed(identity, feed()).map((e) => queries.titleForEntry(e))
  }
}

describe('a YouTube feed polled on one device', () => {
  test('A: two polls of the same document are one entry each', async () => {
    const one = await device()

    await one.poll(VIDEO(1) + VIDEO(2))
    await one.poll(VIDEO(1, 2) + VIDEO(2, 2))

    expect(one.titles().sort()).toEqual(['Video 1', 'Video 2'])
  })

  test('B: a refresh overlapping a sweep is one entry each', async () => {
    const one = await device()

    one.serve(VIDEO(1) + VIDEO(2))

    await Promise.all([
      one.commands.fetchFeed(one.identity, one.feed()),
      one.commands.fetchFeed(one.identity, one.feed())
    ])

    expect(one.titles().sort()).toEqual(['Video 1', 'Video 2'])
  })

  test('C: following from a preview and then polling is one entry each', async () => {
    const one = await device()
    const doc = one.queries.jsonFromXml(FEED(VIDEO(1) + VIDEO(2)))
    const entries = doc.entry.map((data) => ({ id: data.id, data }))

    delete doc.entry

    one.commands.addFeedToIdentity(one.identity, URL + '&x', doc, entries.map((e) => e.data))

    const feed = one.queries.feedForIdentityByUrl(one.identity, URL + '&x')

    one.serve(VIDEO(1) + VIDEO(2))
    await one.commands.fetchFeed(one.identity, feed)

    expect(one.queries.entriesForFeed(one.identity, feed)).toHaveLength(2)
  })

  test('D: a roll up and then a poll is one entry each', async () => {
    const one = await device()

    await one.poll(VIDEO(1) + VIDEO(2))
    await one.commands.createProjectionForIdentity(one.identity)
    await one.poll(VIDEO(1, 2) + VIDEO(2, 2))

    expect(one.titles().sort()).toEqual(['Video 1', 'Video 2'])
  })

  test('G: two tabs over one database, then a restart, is one entry each', async () => {
    const name = `yt-tabs-${Math.random()}`
    const tab1 = await device(name)

    await tab1.poll(VIDEO(1) + VIDEO(2))

    // A second tab: same database on disk, nothing folded in memory yet.
    const tab2 = await device(name)
    // clear() wiped disk, so put tab1's log back as it would be on disk.
    await tab2.merge(tab1.file())
    // tab2 polls without seeing what tab1 wrote after that.
    await tab2.poll(VIDEO(1, 2) + VIDEO(2, 2))

    const merged = await device()
    await merged.merge(tab1.file())
    await merged.merge(tab2.file())

    expect(merged.titles().sort()).toEqual(['Video 1', 'Video 2'])
  })

  // A copy of the same video can arrive after this device first merged its
  // pairs: a legacy random-id create from another device, in the bucket read
  // at boot or in any later sync. The poll cannot mend it, because the lookup
  // finds one copy and stores nothing, so every fold from outside merges.
  const legacyCopyOf = async (one, n) => {
    const other = await device()

    other.state.track(other.identity.id, 'entries', 'random-legacy-id', 'create', { feedId: 'f1', data: one.queries.jsonFromXml(FEED(VIDEO(n))).entry[0] })

    return other.file()
  }

  test('E: a copy arriving from the bucket after the first merge is merged too', async () => {
    const one = await device()

    await one.poll(VIDEO(1))
    one.commands.mergeDuplicateEntriesForIdentity(one.identity)

    await one.commands.importRemoteResponse(one.identity, { status: 200, body: await legacyCopyOf(one, 1) })
    await one.poll(VIDEO(1, 2))

    expect(one.titles()).toEqual(['Video 1'])
  })

  test('F: a copy arriving in an imported identity is merged too', async () => {
    const one = await device()

    await one.poll(VIDEO(1))

    const other = await device(undefined, { empty: true })
    const imported = await other.commands.importIdentity(one.file() + '\n' + await legacyCopyOf(one, 1))

    expect(other.queries.entriesForFeed(imported, other.queries.feedForIdentity(imported, 'f1'))).toHaveLength(1)
  })

  test('H: a fold with nothing to merge writes nothing', async () => {
    const one = await device()

    await one.poll(VIDEO(1) + VIDEO(2))
    one.commands.mergeDuplicateEntriesForIdentity(one.identity)

    const events = one.state.findAllEvents(one.identity.id).length

    await one.commands.importRemoteResponse(one.identity, { status: 200, body: one.file() })
    one.commands.mergeDuplicateEntriesForIdentity(one.identity)

    expect(one.state.findAllEvents(one.identity.id).length).toEqual(events)
  })
})
