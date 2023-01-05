import { mountApp, describe, test, responses } from './helper.js'

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
      path: `/feeds/${expectedFeed.url}`,
      fetch: responses([`<feed><title>${expectedFeed.title}</title><entry><id>123</id><title>${expectedFeed.entries[0].title}</title></entry></feed>`])
    })
  })

  test('shows the feed title', () => {
    expect(app.find('[aria-label="Page title"]').text()).toEqual(expectedFeed.title)
  })

  test('shows the entries', () => {
    expect(app.find('[aria-label="Entry title"]').text()).toEqual(expectedFeed.entries[0].title)
  })

  // test('shows the feed image')
})
