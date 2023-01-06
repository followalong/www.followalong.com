import { mountApp, describe, responses, story, event } from './helper.js'

describe('Follow a feed', () => {
  const expectedFeed = {
    title: 'Feed Title',
    url: 'https://foo.bar/feed.xml',
    entries: [{
      title: 'Entry title'
    }]
  }

  let app

  beforeEach(async () => {
    app = await mountApp({
      path: `/${expectedFeed.url}`,
      fetch: responses([`<feed><title>${expectedFeed.title}</title><entry><id>123</id><title>${expectedFeed.entries[0].title}</title></entry></feed>`])
    })

    await app.click(`[aria-label="Follow ${expectedFeed.title}"]`)
  })

  story('follows the feed', async () => {
    expect(app.find(`[aria-label="Unfollow ${expectedFeed.title}"]`).text()).toEqual('Following')
  })

  event('feeds.create', {
    collection: 'feeds',
    action: 'create',
    data: {
      url: expectedFeed.url,
      data: {
        title: expectedFeed.title
      }
    }
  }, () => { return { app } })

  event('entries.create', {
    collection: 'entries',
    action: 'create',
    data: {
      data: {
        title: expectedFeed.entries[0].title
      }
    }
  }, () => { return { app } })
})
