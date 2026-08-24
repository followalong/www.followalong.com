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
    await app.click('[aria-label="Feed menu"]')

    expect(app.find(`[aria-label="Unfollow ${expectedFeed.title}"]`).text()).toContain('Following')
  })

  // A shared link lands on a feed nobody follows, and following it is the
  // whole reason for the visit, so it does not hide behind the menu.
  story('offers to follow without opening anything', async () => {
    app = await mountApp({
      path: `/${expectedFeed.url}`,
      fetch: responses([`<feed><title>${expectedFeed.title}</title></feed>`])
    })

    expect(app.findAll(`[aria-label="Follow ${expectedFeed.title}"]`).length).toEqual(1)
  })

  story('stops offering once I follow it', () => {
    expect(app.findAll(`[aria-label="Follow ${expectedFeed.title}"]`).length).toEqual(0)
  })

  event('feeds.create', {
    data: {
      url: expectedFeed.url,
      data: {
        title: expectedFeed.title
      }
    }
  }, () => { return { app } })

  event('entries.create', {
    data: {
      data: {
        title: expectedFeed.entries[0].title
      }
    }
  }, () => { return { app } })
})
