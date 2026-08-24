import { mountApp, describe, story, vi, responses } from './helper.js'

describe('Copy a feed URL', () => {
  const feedUrl = 'https://foo.bar/rss.xml'

  let app
  let copyToClipboard

  beforeEach(async () => {
    copyToClipboard = vi.fn()

    app = await mountApp({
      copyToClipboard,
      path: `/${feedUrl}`,
      fetch: responses(['<feed><title>Feed title</title></feed>']),
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/feeds/543/create/v2.1 {"url":"${feedUrl}","data":{"title":"Feed title"}}
          `
        }
      }
    })
  })

  story('shows the feed URL', () => {
    expect(app.text()).toContain(feedUrl)
  })

  story('copies it on demand', async () => {
    await app.click('[aria-label="Feed menu"]')
    await app.click('[aria-label="Copy feed URL"]')

    expect(copyToClipboard).toHaveBeenCalledWith(feedUrl)
  })
})
