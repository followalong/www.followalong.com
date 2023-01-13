import { mountApp, describe, test, responses } from './helper.js'

describe('Fetch in background', () => {
  test('only stores feeds and entries that change', async () => {
    const app = await mountApp({
      fetch: responses([
        '<feed><title>Feed title</title><entry><id>123</id><title>Entry title</title></entry></feed>',
        '<feed><title>Feed title</title><entry><id>123</id><title>Entry title</title></entry></feed>'
      ]),
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/feeds/feed-1/create/v2.1 {"id":"123","url":"http://foo.bar/rss.xml"}
          `
        }
      }
    })
    const originalEventsLength = app.vm.state.events.length

    app.vm.commands.fetchOutdatedFeeds(app.vm.identity)
    app.vm.commands.fetchOutdatedFeeds(app.vm.identity)
    await app.wait()

    expect(app.vm.state.events.length).toEqual(originalEventsLength + 2) // one for entry, one for feed
  })
})
