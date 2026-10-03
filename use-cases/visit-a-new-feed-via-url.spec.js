import { mountApp, describe, test, responses, story } from './helper.js'

describe('Visit a new feed via URL', () => {
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
  })

  story('shows the feed title', () => {
    expect(app.find('[aria-label="Page title"]').text()).toEqual(expectedFeed.title)
  })

  test('shows the entries', () => {
    expect(app.find('[aria-label="Entry title"]').text()).toEqual(expectedFeed.entries[0].title)
  })

  story('does not claim to be looking once it has answered', () => {
    expect(app.text()).not.toContain('Looking for a feed')
  })

  // A page with nothing on it reads as broken; one that says it is asking
  // reads as asking.
  describe('before the feed answers', () => {
    beforeEach(async () => {
      app = await mountApp({
        path: `/${expectedFeed.url}`,
        fetch: () => new Promise(() => {})
      })
    })

    story('says it is looking', () => {
      expect(app.text()).toContain('Looking for a feed at this address')
    })
  })
})
