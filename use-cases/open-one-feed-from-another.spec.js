import { mountApp, describe, story, vi } from './helper.js'

const FEED = (title, entry) => `<feed><title>${title}</title><entry><id>${entry}</id><title>${entry}</title></entry></feed>`

const A = 'https://one.example/rss.xml'
const B = 'https://two.example/rss.xml'

describe('Open one feed from another', () => {
  let app

  beforeEach(async () => {
    const fetch = vi.fn((url) => {
      return Promise.resolve({
        status: 200,
        body: `${url}`.indexOf('two.example') === -1
          ? FEED('Feed One', 'Entry from one')
          : FEED('Feed Two', 'Entry from two')
      })
    })

    app = await mountApp({ path: `/${A}`, fetch })

    for (let i = 0; i < 5; i++) await app.wait()
  })

  story('shows the first feed it was opened at', () => {
    expect(app.text()).toContain('Entry from one')
  })

  // The feed route is a single record, so walking to another feed reuses this
  // page rather than building a new one. Nothing asked for the new feed, so it
  // sat on the old one's articles until the reader left and came back.
  story('asks for the next feed without being reopened', async () => {
    app.vm.$router.push(`/${B}`)

    for (let i = 0; i < 5; i++) await app.wait()

    expect(app.text()).toContain('Entry from two')
    expect(app.text()).not.toContain('Entry from one')
  })

  // Opening a feed marks everything up to now as seen, and the ask that
  // follows takes time, so every article it brings is stamped later than the
  // mark and sits behind the new-items bar: a feed opened for the first time
  // read as empty until the reader left and came back. The wait is what makes
  // it show, which is why nothing caught it before.
  story('shows what the ask brought, rather than holding it back', async () => {
    const slow = await mountApp({
      path: `/${A}`,
      fetch: vi.fn(() => new Promise((resolve) => {
        setTimeout(() => resolve({ status: 200, body: FEED('Feed One', 'Just arrived') }), 1000)
      })),
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
            2/feeds/543/create/v2.1 {"url":"${A}","data":{"title":"Feed One"}}
          `
        }
      }
    })

    for (let i = 0; i < 8; i++) await slow.wait()

    expect(slow.text()).toContain('Just arrived')
    expect(slow.text()).not.toContain('show now')
  })
})
