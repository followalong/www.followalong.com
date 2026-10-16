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

const RIVER_URL = 'https://two.example/rss.xml'

// Ten entries: more than the river shows at first, so a reader can be down it.
const riverSeed = () => ({
  abc123: {
    config: {},
    data: `
      0/identities/abc123/create/v2.1
      1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
      2/feeds/543/create/v2.1 {"url":"${RIVER_URL}","data":{"title":"Feed Two"}}
      ${Array.from({ length: 10 }, (_, i) => `${i + 3}/entries/e${i}/create/v2.1 {"feedId":"543","data":{"guid":"g${i}","title":"Entry ${i}"}}`).join('\n')}
    `
  }
})

describe('Stay where I am reading the river', () => {
  let app
  let scrollTo

  const cards = () => app.findAll('article').length
  const newBar = () => app.find('[aria-label="Show new items"]')

  beforeEach(async () => {
    scrollTo = vi.fn()
    app = await mountApp({ path: '/', scrollTo, state: riverSeed() })

    // jsdom measures nothing, so every scroll looks like the end of the page.
    window.dispatchEvent(new Event('scroll'))
    await app.wait()

    app.vm.commands.track(app.vm.identity, 'entries', null, 'create', {
      feedId: '543',
      data: { guid: 'later', title: 'Arrived while reading' }
    })
    await app.wait()
  })

  story('holds what arrived behind the bar and keeps the cards I scrolled to', () => {
    expect(cards()).toEqual(8)
    expect(newBar().text()).toContain('1 new item')
  })

  // A sync that brings another device's lines folds the whole log again,
  // which rebuilds every projection object, the signal among them. The river
  // watched the signal object, so a fold read as a change of list: back to
  // one page, new items shown, and a jump to the top, every minute or so.
  story('stays put when a sync folds the log', async () => {
    const line = '99/entries/elsewhere/create/v2.1 {"feedId":"543","data":{"guid":"elsewhere","title":"From another device"}}'

    // Through the commands, the way a sync reaches the store.
    await app.vm.commands.state.importRaw(app.vm.identity.id, line)
    await app.wait()

    expect(scrollTo).not.toHaveBeenCalled()
    expect(cards()).toEqual(8)
    expect(newBar().exists()).toBe(true)
  })

  story('reads a different list from its beginning', async () => {
    await app.vm.$router.push('/signals/saved')
    await app.wait()

    expect(scrollTo).toHaveBeenCalled()
  })
})
