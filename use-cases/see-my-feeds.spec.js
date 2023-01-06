import { mountApp, describe, responses, story } from './helper.js'

describe('See my feeds', () => {
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
      path: `/${expectedFeed.url}`,
      fetch: responses([`<feed><title>${expectedFeed.title}</title><entry><id>123</id><title>${expectedFeed.entries[0].title}</title></entry></feed>`]),
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/feeds/${expectedFeed.id}/create/v2.1 {"url":"${expectedFeed.url}","data":{"title":"${expectedFeed.title}"}}
            2/entries/765/create/v2.1 {"feedId":"${expectedFeed.id}","data":{"guid":"987","title":"${localEntryTitle}"}}
          `
        }
      }
    })

    await app.click('[aria-label="Following"]')
  })

  story('shows the feeds I am following', () => {
    expect(app.find('[aria-label="Page title"]').text()).toEqual('Following')
    expect(app.text()).toContain(expectedFeed.title)
  })
})
