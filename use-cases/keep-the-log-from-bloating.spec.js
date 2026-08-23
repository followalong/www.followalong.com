import { mountApp, describe, story, responses } from './helper.js'

const FEED = '<feed><title>Feed title</title></feed>'

const seed = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
`

const countOf = (app, action) => app.vm.queries
  .findAllEvents(app.vm.identity)
  .filter((event) => `${event.collection}.${event.action}` === action)
  .length

describe('Keep the log from bloating', () => {
  let app

  beforeEach(async () => {
    app = await mountApp({
      fetch: responses([FEED, FEED, FEED, FEED]),
      state: { abc123: { config: {}, data: seed } }
    })
  })

  story('records a fetch that changed nothing as one event, however often it runs', async () => {
    const feed = app.vm.queries.feedsForIdentity(app.vm.identity)[0]

    for (let i = 0; i < 4; i++) {
      await app.vm.commands.fetchFeed(app.vm.identity, feed)
      await app.wait()
    }

    expect(countOf(app, 'feeds.fetched')).toEqual(1)
    expect(countOf(app, 'feeds.update')).toEqual(0)
  })

  story('still knows when the feed was last fetched', async () => {
    const feed = app.vm.queries.feedsForIdentity(app.vm.identity)[0]

    await app.vm.commands.fetchFeed(app.vm.identity, feed)
    await app.wait()

    const after = app.vm.queries.feedsForIdentity(app.vm.identity)[0]

    expect(app.vm.queries.lastUpdatedForFeed(after)).toBeGreaterThan(0)
  })

  story('takes the superseded events off the disk, not just out of memory', async () => {
    const feed = app.vm.queries.feedsForIdentity(app.vm.identity)[0]

    for (let i = 0; i < 3; i++) {
      await app.vm.commands.fetchFeed(app.vm.identity, feed)
      await app.wait()
    }

    const db = app.vm.state._dbs[app.vm.identity.id]._db
    const keys = []

    await db.iterate((value, key) => { keys.push(key) })

    expect(keys.filter((key) => key.includes('/fetched/'))).toHaveLength(1)
  })

  story('still writes a real update when the feed actually changed', async () => {
    const feed = app.vm.queries.feedsForIdentity(app.vm.identity)[0]

    app.vm.commands.upsertFeedForIdentity(app.vm.identity, feed, { title: 'A new title' })
    await app.wait()

    expect(countOf(app, 'feeds.update')).toEqual(1)
  })
})
