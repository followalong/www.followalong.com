import { mountApp, describe, story, vi } from './helper.js'

const URL = 'https://one.example/rss.xml'
const FEED = '<feed><title>Feed One</title><entry><id>1</id><title>Just arrived</title></entry></feed>'

const seed = () => ({
  abc123: {
    config: {},
    data: `
      0/identities/abc123/create/v2.1
      1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
      2/feeds/543/create/v2.1 {"url":"${URL}","data":{"title":"Feed One"}}
    `
  }
})

describe('Stay where I am reading', () => {
  let app
  let scrollTo

  beforeEach(async () => {
    scrollTo = vi.fn()

    app = await mountApp({
      path: `/${URL}`,
      scrollTo,
      state: seed(),
      // Answers a moment later, which is when a reader has started reading.
      fetch: vi.fn(() => new Promise((resolve) => {
        setTimeout(() => resolve({ status: 200, body: FEED }), 1000)
      }))
    })

    for (let i = 0; i < 8; i++) await app.wait()
  })

  // Revealing what arrived and jumping to the top are two different things.
  // Tying them together meant a feed answering while somebody was reading
  // threw them back to the first article.
  story('does not jump to the top when a feed answers', () => {
    expect(scrollTo).not.toHaveBeenCalled()
  })

  // Asking for them is the one time the jump is what was wanted.
  story('jumps to the top when I ask to see the new ones', async () => {
    app.vm.commands.track(app.vm.identity, 'entries', null, 'create', {
      feedId: '543',
      data: { guid: 'later', title: 'Arrived while reading' }
    })

    await app.wait()
    await app.click('[aria-label="Show new items"]')

    expect(scrollTo).toHaveBeenCalled()
  })
})
