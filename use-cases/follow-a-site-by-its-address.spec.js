import { mountApp, describe, story, event, vi } from './helper.js'

const BLOG_URL = 'https://blog.example/'
const BLOG_FEED_URL = 'https://blog.example/feed.xml'
const BLOG_PAGE = '<html><head><title>A blog</title><link rel="alternate" type="application/rss+xml" href="/feed.xml"></head><body><p>Hello</p></body></html>'
const BLOG_FEED = '<rss><channel><title>A blog</title><item><guid>1</guid><title>First post</title></item></channel></rss>'

const HANDLE_URL = 'https://www.youtube.com/@linustechtips'
const CHANNEL_ID = 'UCXuqSBlHAE6Xw-yeJA0Tunw'
const CHANNEL_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`
const HANDLE_PAGE = `<html><head><meta itemprop="channelId" content="${CHANNEL_ID}"></head><body><script>{"channelId":"${CHANNEL_ID}"}</script></body></html>`
const CHANNEL_FEED = '<feed xmlns="http://www.w3.org/2005/Atom"><title>Linus Tech Tips</title><entry><id>yt:video:abc</id><title>A video</title></entry></feed>'

const BARE_URL = 'https://nothing.example/'
const BARE_PAGE = '<html><head><title>Nothing here</title></head><body><p>No feed.</p></body></html>'

const PAGES = {
  [BLOG_URL]: BLOG_PAGE,
  [BLOG_FEED_URL]: BLOG_FEED,
  [HANDLE_URL]: HANDLE_PAGE,
  [CHANNEL_FEED_URL]: CHANNEL_FEED,
  [BARE_URL]: BARE_PAGE
}

// Most people paste a site's address, not its feed's. The site says where
// its feed is, so the reader lands on the feed and can follow it.
describe('Follow a site by its address', () => {
  let app
  let fetch

  // The default add-on asks through a proxy, so the address is the tail.
  const addressOf = (asked) => Object.keys(PAGES).find((url) => `${asked}`.endsWith(url))

  const visit = async (url) => {
    fetch = vi.fn((asked) => Promise.resolve({ status: 200, body: PAGES[addressOf(asked)] || '' }))

    app = await mountApp({ fetch, path: `/${url}` })
  }

  describe('a blog\'s home page', () => {
    beforeEach(() => visit(BLOG_URL))

    story('lands on the feed the page names', () => {
      expect(app.find('[aria-label="Page title"]').text()).toEqual('A blog')
      expect(app.find('[aria-label="Entry title"]').text()).toEqual('First post')
      expect(app.vm.$route.fullPath).toEqual(`/${BLOG_FEED_URL}`)
    })

    story('asks for the page once and the feed once', () => {
      expect(fetch.mock.calls.map((call) => addressOf(call[0]))).toEqual([BLOG_URL, BLOG_FEED_URL])
    })

    describe('and follows it', () => {
      beforeEach(() => app.click('[aria-label="Follow A blog"]'))

      event('feeds.create', { data: { url: BLOG_FEED_URL } }, () => ({ app }))
    })
  })

  describe('a YouTube handle page', () => {
    beforeEach(() => visit(HANDLE_URL))

    story('lands on the channel\'s feed', () => {
      expect(app.find('[aria-label="Page title"]').text()).toEqual('Linus Tech Tips')
      expect(app.vm.$route.fullPath).toEqual(`/${CHANNEL_FEED_URL}`)
      expect(app.findAll('[aria-label="Follow Linus Tech Tips"]').length).toEqual(1)
    })
  })

  describe('a page that names no feed', () => {
    beforeEach(() => visit(BARE_URL))

    story('says so', () => {
      expect(app.text()).toContain('No feed found at this address.')
      expect(app.findAll('[aria-label^="Follow "]').map((el) => el.attributes('aria-label'))).toEqual(['Follow Along home'])
    })
  })
})
