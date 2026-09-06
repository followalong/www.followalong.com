import { mountApp, describe, story, event } from './helper.js'
import FeedView from '../src/app/views/feed/component.vue'

describe('Catch up on a feed', () => {
  const entryId = '6363'

  let app
  let unreadBefore
  let orderBefore

  beforeEach(async () => {
    app = await mountApp({
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
            2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
            3/entries/6363/create/v2.1 {"feedId":"543","data":{"guid":"987","title":"Entry title","pubDate":"Tue, 02 Jan 2024 00:00:00 GMT"}}
            4/entries/6364/create/v2.1 {"feedId":"543","data":{"guid":"988","title":"Older entry","pubDate":"Mon, 01 Jan 2024 00:00:00 GMT"}}
          `
        }
      }
    })

    await app.click('[aria-label="Feed link"]')

    const view = app.findComponent(FeedView)

    unreadBefore = view.vm.unreadEntries
    orderBefore = unreadBefore.map((entry) => entry.id)

    await app.click('[aria-label="Feed menu"]')
    await app.click('[aria-label="Catch up on feed"]')
  })

  // Catching up works oldest first, which it used to arrange by reversing the
  // computed itself. A computed's value is cached and handed to whoever asks
  // next, so turning it round in place turned it round for them too.
  story('leaves the list it read alone', () => {
    expect(unreadBefore.map((entry) => entry.id)).toEqual(orderBefore)
  })

  story('toggles the marker', () => {
    expect(app.findAll(`[aria-label="Mark as unread ${entryId}"]`).length).toEqual(1)
  })

  event('entries.markRead', {
    objectId: entryId
  }, () => { return { app } })
})
