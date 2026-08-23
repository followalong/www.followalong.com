import { describe, test, expect, beforeEach } from 'vitest'
import MultiEventStore from '../state/multi-event-store.js'
import runners from '../state/runners.js'
import Queries from './index.js'

describe('fetchErrorForFeed', () => {
  let state, queries, identity

  beforeEach(async () => {
    state = new MultiEventStore(`status-${Math.random()}`, 'v2.3', runners)
    await state.clear()
    identity = { id: state.createDB(null, {}) }
    queries = new Queries({ state })
    state.track(identity.id, 'feeds', 'f1', 'create', { url: 'https://world.hey.com/dhh/feed.atom', data: { title: 'A' } })
  })

  const feed = () => queries.feedForIdentity(identity, 'f1')

  test('is nothing for a feed that has not failed', () => {
    expect(queries.fetchErrorForFeed(feed())).toBeFalsy()
  })

  test('names the host and the status it refused with', () => {
    state.track(identity.id, 'feeds', 'f1', 'fetchFailed', { count: 1, status: 403 })

    expect(queries.fetchErrorForFeed(feed())).toContain('world.hey.com')
    expect(queries.fetchErrorForFeed(feed())).toContain('403')
  })

  test('reports a failure that carried no status', () => {
    state.track(identity.id, 'feeds', 'f1', 'fetchFailed', { count: 1 })

    expect(queries.fetchErrorForFeed(feed())).toContain('world.hey.com')
  })

  test('clears once the feed answers again', () => {
    state.track(identity.id, 'feeds', 'f1', 'fetchFailed', { count: 1, status: 403 })
    state.track(identity.id, 'feeds', 'f1', 'fetched', {})

    expect(queries.fetchErrorForFeed(feed())).toBeFalsy()
  })
})
