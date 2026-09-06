import { mountApp, describe, story } from './helper.js'

const seed = () => ({
  abc123: {
    config: {},
    data: `
      0/identities/abc123/create/v2.1
      1/feeds/aaa/create/v2.1 {"url":"https://one.example/feed","data":{"title":"zebra letters"}}
      2/feeds/bbb/create/v2.1 {"url":"https://two.example/feed","data":{"title":"Apple Times"}}
      3/feeds/ccc/create/v2.1 {"url":"https://three.example/feed","data":{"title":"middle ground"}}
      4/entries/e1/create/v2.1 {"feedId":"aaa","data":{"guid":"g1","title":"Unread one"}}
      5/entries/e2/create/v2.1 {"feedId":"aaa","data":{"guid":"g2","title":"Unread two"}}
    `
  }
})

describe('See my feeds in order', () => {
  let app

  beforeEach(async () => {
    app = await mountApp({ state: seed() })

    await app.click('[aria-label="Feeds"]')
  })

  const titles = () => app.findAll('[data-row] .font-semibold').map((row) => row.text())

  // A list of a hundred feeds is something to find your way around, and the
  // only order somebody can predict is the alphabet. Putting whichever feed
  // happened to publish most at the top moved everything else each time.
  story('lists them alphabetically', () => {
    expect(titles()).toEqual(['Apple Times', 'middle ground', 'zebra letters'])
  })

  // Sorting on the raw strings puts every capital ahead of every lowercase,
  // so a feed called "zebra" came before one called "Apple".
  story('does not put the capitals first', () => {
    expect(titles()[0]).toEqual('Apple Times')
  })
})
