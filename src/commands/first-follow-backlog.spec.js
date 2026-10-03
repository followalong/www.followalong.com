import { describe, test, expect, beforeEach } from 'vitest'
import MultiEventStore from '../state/multi-event-store.js'
import runners from '../state/runners.js'
import Queries from '../queries/index.js'
import Commands from './index.js'

// Episode n is n days after the epoch, so a higher n is newer.
const item = (n) => ({ guid: `g${n}`, title: `Episode ${n}`, pubDate: new Date(n * 86400000).toUTCString() })
const feedXml = (from, to) => {
  const items = []
  for (let n = from; n <= to; n++) items.push(`<item><guid>g${n}</guid><title>Episode ${n}</title><pubDate>${item(n).pubDate}</pubDate></item>`)
  return `<rss><channel><title>Pod</title>${items.join('')}</channel></rss>`
}

// A podcast followed today lands hundreds of episodes. The newest ten stay
// unread; the rest is read already, so Home stays a river of new things and
// the backlog waits on the feed page.
describe('the backlog on first follow', () => {
  let state, queries, commands, identity, body

  beforeEach(async () => {
    const fetch = () => Promise.resolve({ status: 200, body })

    state = new MultiEventStore(`backlog-${Math.random()}`, 'v2.3', runners)
    await state.clear()
    identity = { id: state.createDB(null, {}) }
    queries = new Queries({ state, fetch })
    commands = new Commands({ state, queries, fetch })
  })

  const feed = () => queries.feedsForIdentity(identity)[0]
  const unreadTitles = () => queries.unreadEntries(queries.entriesForFeed(identity, feed())).map((e) => queries.titleForEntry(e)).sort()

  test('following from a preview leaves the newest ten unread', () => {
    commands.addFeedToIdentity(identity, 'https://pod.example/feed', { title: 'Pod' }, Array.from({ length: 15 }, (_, i) => item(i + 1)))

    expect(queries.entriesForFeed(identity, feed()).length).toEqual(15)
    expect(unreadTitles()).toEqual(['Episode 10', 'Episode 11', 'Episode 12', 'Episode 13', 'Episode 14', 'Episode 15', 'Episode 6', 'Episode 7', 'Episode 8', 'Episode 9'])
  })

  test('a feed followed empty is caught up by its first poll', async () => {
    commands.addFeedToIdentity(identity, 'https://pod.example/feed', { title: 'Pod' })
    body = feedXml(1, 15)

    await commands.fetchFeed(identity, feed())

    expect(unreadTitles().length).toEqual(10)
    expect(unreadTitles()).not.toContain('Episode 5')
  })

  test('a later poll is left alone', async () => {
    commands.addFeedToIdentity(identity, 'https://pod.example/feed', { title: 'Pod' }, Array.from({ length: 15 }, (_, i) => item(i + 1)))
    body = feedXml(1, 30)

    await commands.fetchFeed(identity, feed())

    expect(unreadTitles().length).toEqual(25)
  })

  test('a feed with ten or fewer entries is left as it came', () => {
    commands.addFeedToIdentity(identity, 'https://pod.example/feed', { title: 'Pod' }, Array.from({ length: 10 }, (_, i) => item(i + 1)))

    expect(unreadTitles().length).toEqual(10)
  })

  // Catch me up on the feed page is the same move with nothing kept.
  test('catching up keeps nothing', () => {
    commands.addFeedToIdentity(identity, 'https://pod.example/feed', { title: 'Pod' }, [item(1), item(2), item(3)])

    commands.catchUpOnFeedForIdentity(identity, feed())

    const read = queries.entriesForFeed(identity, feed()).filter((e) => queries.isEntryRead(e))

    expect(read.length).toEqual(3)
  })
})
