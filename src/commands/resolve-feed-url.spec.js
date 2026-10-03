import { describe, test, expect, beforeEach } from 'vitest'
import MultiEventStore from '../state/multi-event-store.js'
import runners from '../state/runners.js'
import Queries from '../queries/index.js'
import Commands from './index.js'

const FEED = '<rss><channel><title>A</title></channel></rss>'
const PAGE = '<html><head><link rel="alternate" type="application/atom+xml" href="/atom.xml"></head><body></body></html>'
const HANDLE_PAGE = '<html><head><meta itemprop="channelId" content="UCXuqSBlHAE6Xw-yeJA0Tunw"></head></html>'
const BARE_PAGE = '<html><head><title>x</title></head><body></body></html>'

// A pasted address is a feed, or a page that names one, or neither.
describe('resolveFeedUrl', () => {
  let commands, identity, calls, pages

  beforeEach(async () => {
    calls = []
    pages = {}

    const fetch = (url) => {
      calls.push(`${url}`)
      return Promise.resolve({ status: 200, body: pages[url] || '' })
    }

    const state = new MultiEventStore(`resolve-${Math.random()}`, 'v2.3', runners)
    await state.clear()
    identity = { id: state.createDB(null, {}) }
    const queries = new Queries({ state, fetch })
    commands = new Commands({ state, queries, fetch })
  })

  test('answers the address itself when it is a feed', async () => {
    pages['https://a.example/feed'] = FEED

    expect(await commands.resolveFeedUrl(identity, 'https://a.example/feed')).toEqual('https://a.example/feed')
    expect(calls).toEqual(['https://a.example/feed'])
  })

  test('answers the feed a page names, without fetching it', async () => {
    pages['https://a.example/'] = PAGE

    expect(await commands.resolveFeedUrl(identity, 'https://a.example/')).toEqual('https://a.example/atom.xml')
    expect(calls).toEqual(['https://a.example/'])
  })

  test('answers a YouTube page with its channel feed', async () => {
    pages['https://www.youtube.com/@handle'] = HANDLE_PAGE

    expect(await commands.resolveFeedUrl(identity, 'https://www.youtube.com/@handle')).toEqual('https://www.youtube.com/feeds/videos.xml?channel_id=UCXuqSBlHAE6Xw-yeJA0Tunw')
  })

  test('reads a page already in hand rather than asking again', async () => {
    const response = { status: 200, body: PAGE, data: { html: {} } }

    expect(await commands.resolveFeedUrl(identity, 'https://a.example/', response)).toEqual('https://a.example/atom.xml')
    expect(calls).toEqual([])
  })

  test('rejects in a sentence when a page names no feed', async () => {
    pages['https://a.example/'] = BARE_PAGE

    await expect(commands.resolveFeedUrl(identity, 'https://a.example/')).rejects.toThrow('No feed found at this address.')
  })
})
