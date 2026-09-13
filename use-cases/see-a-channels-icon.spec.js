import { mountApp, describe, story, event, vi } from './helper.js'

const FEED_URL = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCX'
const CHANNEL_URL = 'https://www.youtube.com/channel/UCX'
const ICON = 'https://yt3.googleusercontent.com/abc=s900-c-k-c0x00ffffff-no-rj'
const THUMBNAIL = 'https://i1.ytimg.com/vi/new/hqdefault.jpg'

const FEED = `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <title>Linus Tech Tips</title>
  <link rel="alternate" href="${CHANNEL_URL}"/>
  <author><name>Linus Tech Tips</name><uri>${CHANNEL_URL}</uri></author>
  <entry>
    <id>yt:video:new</id>
    <title>New</title>
    <published>2026-09-12T00:00:00+00:00</published>
    <media:group><media:thumbnail url="${THUMBNAIL}"/></media:group>
  </entry>
</feed>`

const PAGE_WITH_ICON = `<html><head><meta property="og:title" content="Linus Tech Tips"><meta property="og:image" content="${ICON}"></head><body></body></html>`
const PAGE_WITHOUT_ICON = '<html><head><meta property="og:title" content="Linus Tech Tips"></head><body></body></html>'

const callsFor = (fetch, url) => fetch.mock.calls.filter((call) => `${call[0]}` === url).length

// A channel feed carries no picture of the channel, so the app reads the
// channel page once and keeps what it says about itself.
describe('See a channel\'s icon', () => {
  let app
  let fetch

  const boot = async (page) => {
    fetch = vi.fn((url) => {
      return Promise.resolve({ status: 200, body: `${url}` === CHANNEL_URL ? page : FEED })
    })

    app = await mountApp({
      fetch,
      automaticFetch: true,
      path: '/following',
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/feeds/aaa/create/v2.1 {"url":"${FEED_URL}","data":{"title":"Linus Tech Tips"}}
          `
        }
      }
    })

    // The sweep is scheduled off a timer and asks the feed, then its page.
    for (let i = 0; i < 4; i++) await app.wait()
  }

  // The sweep and its timer are module state keyed by identity id, so a shell
  // left mounted would answer the next one's poll with its own.
  afterEach(() => app.unmount())

  const row = () => app.find('[aria-label="Visit Linus Tech Tips feed"]')

  // The sweep resolves off a timer, so it is kicked off and the timers run.
  const pollAgain = async () => {
    app.vm.commands.fetchFeedsForIdentity(app.vm.queries.allIdentities()[0])

    for (let i = 0; i < 4; i++) await app.wait()
  }

  describe('when the channel page names one', () => {
    beforeEach(() => boot(PAGE_WITH_ICON))

    story('asks the channel page once and shows its icon', async () => {
      expect(callsFor(fetch, CHANNEL_URL)).toEqual(1)
      expect(row().find('img').attributes('src')).toEqual(ICON)
    })

    story('does not ask the page again on the next poll', async () => {
      await pollAgain()

      expect(callsFor(fetch, FEED_URL)).toBeGreaterThan(1)
      expect(callsFor(fetch, CHANNEL_URL)).toEqual(1)
    })

    event('feeds.iconFound', { data: { url: ICON } }, () => ({ app }))
  })

  describe('when the channel page names none', () => {
    beforeEach(() => boot(PAGE_WITHOUT_ICON))

    story('falls back to the latest video thumbnail', () => {
      expect(callsFor(fetch, CHANNEL_URL)).toEqual(1)
      expect(row().find('img').attributes('src')).toEqual(THUMBNAIL)
    })

    story('does not ask the page again on the next poll', async () => {
      await pollAgain()

      expect(callsFor(fetch, CHANNEL_URL)).toEqual(1)
    })

    event('feeds.iconNotFound', {}, () => ({ app }))
  })
})
