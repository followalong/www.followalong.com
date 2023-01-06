import { mountApp, describe, test, responses, story } from './helper.js'

describe('Visit an existing feed via URL', () => {
  const localEntryTitle = 'Local entry'
  const expectedFeed = {
    id: 'zxy987',
    title: 'Feed title',
    url: 'https://foo.bar/feed.xml',
    entries: [{
      title: 'Remote entry'
    }]
  }

  let app

  beforeEach(async () => {
    app = await mountApp({
      path: `/feeds/${expectedFeed.url}`,
      fetch: responses([`<feed><title>${expectedFeed.title}</title><entry><id>123</id><title>${expectedFeed.entries[0].title}</title></entry></feed>`]),
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1 {"id":"abc123"}
            1/feeds/${expectedFeed.id}/create/v2.1 {"url":"${expectedFeed.url}","data":{"title":"${expectedFeed.title}"}}
            2/entries/765/create/v2.1 {"feedId":"${expectedFeed.id}","data":{"guid":"987","title":"${localEntryTitle}"}}
          `
        }
      }
    })
  })

  story('shows the feed title', () => {
    expect(app.find('[aria-label="Page title"]').text()).toEqual(expectedFeed.title)
  })

  test('shows the local entries', () => {
    expect(app.findAll('[aria-label="Entry title"]')[0].text()).toEqual(localEntryTitle)
  })

  test('shows the remote entries', () => {
    expect(app.findAll('[aria-label="Entry title"]')[1].text()).toEqual(expectedFeed.entries[0].title)
  })
})
