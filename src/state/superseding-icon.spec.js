import { describe, test, expect, beforeEach } from 'vitest'
import MultiEventStore from './multi-event-store.js'
import runners from './runners.js'
import Queries from '../queries/index.js'

// A feed has one icon. Looking it up again must replace the record, not add
// to it, so the log never grows with the polling.
describe('looking up a feed icon', () => {
  let state, queries, identity, name, clock

  beforeEach(async () => {
    name = `icon-${Math.random()}`
    state = new MultiEventStore(name, 'v2.3', runners)
    await state.clear()
    identity = { id: state.createDB(null, {}) }
    queries = new Queries({ state })

    state.track(identity.id, 'identities', identity.id, 'create', { name: 'Me' })
    state.track(identity.id, 'feeds', 'f1', 'create', { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCX', data: { title: 'A' } })

    clock = Date.now() + 1000
  })

  const feed = () => queries.feedForIdentity(identity, 'f1')
  const count = (action) => state.findAllEvents(identity.id).filter((e) => e.action === action).length

  const reloaded = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))

    const booted = new MultiEventStore(name, 'v2.3', runners)

    await booted.restore()

    return new Queries({ state: booted }).feedForIdentity(identity, 'f1')
  }

  test('iconFound stamps the icon and when it was looked up', () => {
    state.track(identity.id, 'feeds', 'f1', 'iconFound', { url: 'https://yt3.example/icon.jpg' }, clock)

    expect(feed().icon).toEqual('https://yt3.example/icon.jpg')
    expect(feed().iconLookedUpAt).toEqual(clock)
  })

  test('iconNotFound stamps only when it was looked up', () => {
    state.track(identity.id, 'feeds', 'f1', 'iconNotFound', {}, clock)

    expect(feed().icon).toBeUndefined()
    expect(feed().iconLookedUpAt).toEqual(clock)
  })

  test('keeps one of each however often it is looked up', () => {
    for (let i = 0; i < 20; i++) {
      state.track(identity.id, 'feeds', 'f1', 'iconFound', { url: `https://yt3.example/${i}.jpg` }, clock++)
      state.track(identity.id, 'feeds', 'f1', 'iconNotFound', {}, clock++)
    }

    expect(count('iconFound')).toEqual(1)
    expect(count('iconNotFound')).toEqual(1)
  })

  test('still shows the latest icon after a reload', async () => {
    state.track(identity.id, 'feeds', 'f1', 'iconFound', { url: 'https://yt3.example/old.jpg' }, clock++)
    state.track(identity.id, 'feeds', 'f1', 'iconFound', { url: 'https://yt3.example/new.jpg' }, clock++)

    const booted = await reloaded()

    expect(booted.icon).toEqual('https://yt3.example/new.jpg')
    expect(booted.iconLookedUpAt).toEqual(clock - 1)
  })

  // A later miss dates the lookup but does not throw away a picture we have.
  test('keeps the icon when a later lookup finds nothing', async () => {
    state.track(identity.id, 'feeds', 'f1', 'iconFound', { url: 'https://yt3.example/icon.jpg' }, clock++)
    state.track(identity.id, 'feeds', 'f1', 'iconNotFound', {}, clock++)

    const booted = await reloaded()

    expect(booted.icon).toEqual('https://yt3.example/icon.jpg')
    expect(booted.iconLookedUpAt).toEqual(clock - 1)
  })

  test('keeps them apart per feed', () => {
    state.track(identity.id, 'feeds', 'f2', 'create', { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCY', data: { title: 'B' } })
    state.track(identity.id, 'feeds', 'f1', 'iconFound', { url: 'https://yt3.example/a.jpg' })
    state.track(identity.id, 'feeds', 'f2', 'iconFound', { url: 'https://yt3.example/b.jpg' })

    expect(count('iconFound')).toEqual(2)
  })
})
