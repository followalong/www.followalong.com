import { describe, test, expect, beforeEach } from 'vitest'
import MultiEventStore from './multi-event-store.js'
import runners from './runners.js'
import Queries from '../queries/index.js'

// Tracking an event drops the ones it supersedes. Folding a log did not, so
// every merge from the bucket brought back what this device had already
// dropped, and the next upload carried them to every other device. One real
// log held 4,591 feeds.fetched for 132 feeds.
describe('folding a log that is full of superseded events', () => {
  let state, queries, identity, name

  const V = 'v2.3'

  // Above the creates already in the log: a time is the replay order, so an
  // event stamped before the object it changes folds against nothing.
  let floor

  const fetched = (feedId, at) => {
    const time = floor + at

    return `${time}/feeds/${feedId}/fetched/${V} {"etag":"\\"e-${at}\\""}`
  }

  beforeEach(async () => {
    name = `merge-supersede-${Math.random()}`
    state = new MultiEventStore(name, V, runners)
    await state.clear()
    identity = { id: state.createDB(null, {}) }
    queries = new Queries({ state })

    state.track(identity.id, 'identities', identity.id, 'create', { name: 'Me' })
    state.track(identity.id, 'feeds', 'f1', 'create', { url: 'https://a.example/feed', data: { title: 'A' } })
    state.track(identity.id, 'feeds', 'f2', 'create', { url: 'https://b.example/feed', data: { title: 'B' } })

    floor = Date.now() + 1000
  })

  const held = (action) => state.findAllEvents(identity.id).filter((e) => e.action === action)
  const feed = (id) => queries.feedForIdentity(identity, id)
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

  const rows = async () => {
    await settle()

    return (await state._dbs[identity.id]._db.keys()).filter((k) => k.indexOf('/fetched/') !== -1)
  }

  test('keeps one of them per feed', async () => {
    const log = [1000, 2000, 3000, 4000].map((t) => fetched('f1', t))
      .concat([1500, 2500].map((t) => fetched('f2', t)))
      .join('\n')

    await state.importRaw(identity.id, log)

    expect(held('fetched').length).toEqual(2)
  })

  test('keeps the newest, not whichever it happened to fold last', async () => {
    await state.importRaw(identity.id, [fetched('f1', 4000), fetched('f1', 1000), fetched('f1', 3000)].join('\n'))

    expect(held('fetched').length).toEqual(1)
    expect(held('fetched')[0].time).toEqual(floor + 4000)
    expect(feed('f1').etag).toEqual('"e-4000"')
  })

  // The reason a fold cannot simply keep the last thing it saw: a merge is
  // where an old event turns up late, and arriving late is not the same as
  // being newer.
  test('an old one arriving late does not win', async () => {
    await state.importRaw(identity.id, fetched('f1', 5000))
    await state.importRaw(identity.id, fetched('f1', 2000))

    expect(held('fetched').length).toEqual(1)
    expect(feed('f1').etag).toEqual('"e-5000"')
  })

  test('does not ratchet when the same log is merged again', async () => {
    const log = [1000, 2000, 3000].map((t) => fetched('f1', t)).join('\n')

    await state.importRaw(identity.id, log)
    await state.importRaw(identity.id, log)
    await state.importRaw(identity.id, log)

    expect(held('fetched').length).toEqual(1)
  })

  test('takes them off the disk too, so the log stops growing', async () => {
    await state.importRaw(identity.id, [1000, 2000, 3000, 4000].map((t) => fetched('f1', t)).join('\n'))

    expect(await rows()).toHaveLength(1)
  })

  test('leaves what it dropped out of the copy it uploads', async () => {
    await state.importRaw(identity.id, [1000, 2000, 3000].map((t) => fetched('f1', t)).join('\n'))

    const file = queries.eventsToFile(identity)

    expect(file.split('\n').filter((line) => line.indexOf('/fetched/') !== -1)).toHaveLength(1)
  })

  // The migration: a device whose log is already full of them prunes on the
  // next boot rather than waiting for a merge.
  test('prunes a log it reads off the disk', async () => {
    const db = state._dbs[identity.id]._db

    for (const time of [1000, 2000, 3000, 4000, 5000]) {
      await db.setItem(`${floor + time}/feeds/f1/fetched/${V}`, JSON.stringify({ etag: `"e-${time}"` }))
    }

    const booted = new MultiEventStore(name, V, runners)

    await booted.restore()
    await settle()

    const bootedQueries = new Queries({ state: booted })

    expect(booted.findAllEvents(identity.id).filter((e) => e.action === 'fetched').length).toEqual(1)
    expect(bootedQueries.feedForIdentity(identity, 'f1').etag).toEqual('"e-5000"')
    expect((await db.keys()).filter((k) => k.indexOf('/fetched/') !== -1)).toHaveLength(1)
  })

  // Whatever it drops sorts by time, so the oldest are at the front - the
  // opposite end from where tracking one looks.
  test('drops hundreds without walking the log once per event', async () => {
    const log = []

    for (let i = 0; i < 400; i++) log.push(fetched(`f${i % 2 ? 1 : 2}`, 1000 + i))

    const at = Date.now()

    await state.importRaw(identity.id, log.join('\n'))

    expect(held('fetched').length).toEqual(2)
    expect(Date.now() - at).toBeLessThan(2000)
  })

  test('leaves an action that does not supersede alone', async () => {
    const log = [1, 2, 3].map((n) => `${floor + 9000 + n}/entries/e${n}/create/${V} {"feedId":"f1","data":{"guid":"g${n}"}}`)

    await state.importRaw(identity.id, log.join('\n'))

    expect(state.findAllEvents(identity.id).filter((e) => e.action === 'create' && e.collection === 'entries').length).toEqual(3)
  })
})
