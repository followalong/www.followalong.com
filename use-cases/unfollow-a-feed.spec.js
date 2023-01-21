import { mountApp, describe, responses, story, event } from './helper.js'

describe('Unfollow a feed', () => {
  const expectedFeed = {
    id: '8734ncvmn',
    title: 'Feed Title',
    url: 'https://foo.bar/feed.xml',
    entries: [{
      id: 'bvc544',
      title: 'Entry title'
    }]
  }

  let app

  beforeEach(async () => {
    app = await mountApp({
      path: `/${expectedFeed.url}`,
      fetch: responses([
        '<changelog></changelog>',
        `<feed><title>${expectedFeed.title}</title><entry><id>123</id><title>${expectedFeed.entries[0].title}</title></entry></feed>`
      ]),
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/feeds/${expectedFeed.id}/create/v2.1 {"url":"${expectedFeed.url}","data":{"title":"${expectedFeed.title}"}}
            2/entries/${expectedFeed.entries[0].id}/create/v2.1 {"feedId":"${expectedFeed.id}","data":{"guid":"987","title":"${expectedFeed.entries[0].title}"}}
          `
        }
      }
    })

    await app.click(`[aria-label="Unfollow ${expectedFeed.title}"]`)
  })

  story('unfollows the feed', () => {
    expect(app.find(`[aria-label="Follow ${expectedFeed.title}"]`).text()).toEqual('Follow')
  })

  event('feeds.delete', {
    objectId: expectedFeed.id
  }, () => { return { app } })

  event('entries.delete', {
    objectId: expectedFeed.entries[0].id
  }, () => { return { app } })
})
