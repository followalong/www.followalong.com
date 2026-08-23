import { mountApp, describe, story } from './helper.js'

const seed = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/feeds/quiet/create/v2.1 {"url":"https://quiet.example/rss.xml","data":{"title":"Quiet blog"}}
  2/feeds/busy/create/v2.1 {"url":"https://busy.example/rss.xml","data":{"title":"Busy blog"}}
  3/entries/q1/create/v2.1 {"feedId":"quiet","data":{"guid":"q1","title":"Old quiet post"}}
  4/entries/b1/create/v2.1 {"feedId":"busy","data":{"guid":"b1","title":"New busy post"}}
  5/entries/b2/create/v2.1 {"feedId":"busy","data":{"guid":"b2","title":"Another busy post"}}
  6/entries/q1/markRead/v2.1
`

describe('See which feeds have something new', () => {
  let app

  beforeEach(async () => {
    app = await mountApp({ state: { abc123: { config: {}, data: seed } } })

    await app.click('[aria-label="Feeds"]')
  })

  story('counts what is unread, not what exists', () => {
    const busy = app.find('[aria-label="Visit Busy blog feed"]')

    expect(busy.text()).toContain('2 new')
  })

  story('says nothing is new rather than showing a zero', () => {
    const quiet = app.find('[aria-label="Visit Quiet blog feed"]')

    expect(quiet.text()).not.toContain('0 new')
    expect(quiet.text()).toContain('Nothing new')
  })

  story('puts the feeds with something new first', () => {
    const titles = app.findAll('[data-row]').map((row) => row.text())

    expect(titles[0]).toContain('Busy blog')
  })

  story('keeps a feed with nothing new quiet', () => {
    const quiet = app.find('[aria-label="Visit Quiet blog feed"]')

    expect(quiet.classes()).toContain('opacity-80')
  })
})
