import { describe, test, expect, beforeEach } from 'vitest'
import MultiEventStore from '../state/multi-event-store.js'
import runners from '../state/runners.js'
import Queries from './index.js'

// A video channel's feed names no picture of its own, so the Feeds page shows
// the latest video's thumbnail in its place.
describe('thumbnailForFeed', () => {
  let state
  let queries
  let identity

  const entry = (feedId, guid, pubDate, thumbnail) => ({
    feedId,
    data: Object.assign({ guid, pubDate }, thumbnail ? { 'media:group': { 'media:thumbnail': { '@_url': thumbnail } } } : {})
  })

  beforeEach(async () => {
    state = new MultiEventStore(`thumb-${Math.random()}`, 'v2.3', runners)
    await state.clear()
    identity = { id: state.createDB(null, {}) }
    queries = new Queries({ state })
  })

  test('prefers the channel icon a lookup found', () => {
    state.track(identity.id, 'feeds', 'f1', 'create', { url: 'https://a.example', data: { image: { url: 'https://a.example/cover.png' } } })
    state.track(identity.id, 'feeds', 'f1', 'iconFound', { url: 'https://yt3.example/icon.jpg' })

    expect(queries.thumbnailForFeed(identity, queries.feedForIdentity(identity, 'f1'))).toEqual('https://yt3.example/icon.jpg')
  })

  test('keeps the image a feed names for itself', () => {
    state.track(identity.id, 'feeds', 'f1', 'create', { url: 'https://a.example', data: { image: { url: 'https://a.example/cover.png' } } })
    state.track(identity.id, 'entries', 'e1', 'create', entry('f1', 'g1', 'Mon, 01 May 2023 00:00:00 GMT', 'https://i.ytimg.com/vi/one/hqdefault.jpg'))

    expect(queries.thumbnailForFeed(identity, queries.feedForIdentity(identity, 'f1'))).toEqual('https://a.example/cover.png')
  })

  test('takes the newest entry thumbnail when the feed names none', () => {
    state.track(identity.id, 'feeds', 'f1', 'create', { url: 'https://a.example', data: { title: 'A' } })
    state.track(identity.id, 'entries', 'e1', 'create', entry('f1', 'g1', 'Mon, 01 May 2023 00:00:00 GMT', 'https://i.ytimg.com/vi/old/hqdefault.jpg'))
    state.track(identity.id, 'entries', 'e2', 'create', entry('f1', 'g2', 'Tue, 02 May 2023 00:00:00 GMT', 'https://i.ytimg.com/vi/new/hqdefault.jpg'))

    expect(queries.thumbnailForFeed(identity, queries.feedForIdentity(identity, 'f1'))).toEqual('https://i.ytimg.com/vi/new/hqdefault.jpg')
  })

  test('shows nothing when no entry carries a picture either', () => {
    state.track(identity.id, 'feeds', 'f1', 'create', { url: 'https://a.example', data: { title: 'A' } })
    state.track(identity.id, 'entries', 'e1', 'create', entry('f1', 'g1', 'Mon, 01 May 2023 00:00:00 GMT'))

    expect(queries.thumbnailForFeed(identity, queries.feedForIdentity(identity, 'f1'))).toBeFalsy()
  })
})
