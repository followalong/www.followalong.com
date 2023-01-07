import { mountApp, describe, story, vi } from './helper.js'

describe('Show new items', () => {
  let app

  beforeEach(async () => {
    app = await mountApp({
      state: {
        abc123: {
          config: {},
          data: `
            1/identities/abc123/create/v2.1
            2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
            ${Date.now() + 3001}/entries/234/create/v2.1 {"feedId":"543","data":{"guid":"987","title":"Entry title"}}
          `
        }
      }
    })

    vi.setSystemTime(Date.now() + 3002)

    await app.click('[aria-label="Show new items"]')
  })

  story('shows the items', () => {
    expect(app.find('[aria-label="Entry title"]').text()).toEqual('Entry title')
  })

  test('hides the banner', () => {
    expect(app.findAll('[aria-label="Show new items"]').length).toEqual(0)
  })
})
