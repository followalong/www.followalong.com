import { mountApp, describe, story, test, responses, vi } from './helper.js'

const URL = 'https://one.example/rss.xml'
const FEED = '<feed><title>Feed One</title><entry><id>new</id><title>Just arrived</title></entry></feed>'

const seed = (entries) => ({
  abc123: {
    config: {},
    data: `
      0/identities/abc123/create/v2.1
      1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
      2/feeds/543/create/v2.1 {"url":"${URL}","data":{"title":"Feed One"}}
      ${entries}
    `
  }
})

const sweep = async (app) => {
  // The sweep answers after the river was opened, which is what makes what
  // it brings "new".
  vi.setSystemTime(Date.now() + 1000)

  const sweeping = app.vm.commands.fetchOutdatedFeeds(app.vm.identity)
  for (let i = 0; i < 8; i++) await app.wait()
  await sweeping
}

// A reader who has just followed something has an empty page and a bar saying
// the page is not empty. There is nobody to move under, so the sweep shows
// what it brought.
describe('See what the first sweep brings', () => {
  let app

  beforeEach(async () => {
    app = await mountApp({ state: seed(''), fetch: responses([FEED]) })
    await sweep(app)
  })

  story('shows the entries at once', () => {
    expect(app.find('[aria-label="Entry title"]').text()).toEqual('Just arrived')
  })

  test('shows no new-items bar', () => {
    expect(app.findAll('[aria-label="Show new items"]').length).toEqual(0)
  })
})

// A river with a page on it may have a reader on it, and nothing moves under
// a reader.
describe('See what the first sweep brings: a river with a page already', () => {
  let app

  beforeEach(async () => {
    const page = [1, 2, 3, 4].map((n) => `${10 + n}/entries/e${n}/create/v2.1 {"feedId":"543","data":{"guid":"${n}","title":"Already here ${n}"}}`).join('\n')

    app = await mountApp({ state: seed(page), fetch: responses([FEED]) })
    await sweep(app)
  })

  story('holds the entries behind the bar', () => {
    expect(app.findAll('[aria-label="Entry title"]').map((el) => el.text())).not.toContain('Just arrived')
    expect(app.find('[aria-label="Show new items"]').text()).toContain('1 new item')
  })
})
