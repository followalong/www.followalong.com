import { mountApp, describe, test, story, event } from './helper.js'

// Enough read entries to push the saved one past the roll up's cap, and the
// saved one dated oldest so it is the first thing a cap would drop.
const OTHERS = Array.from({ length: 20 }, (_, n) => {
  const date = new Date(1700000000000 + (n + 1) * 86400000).toUTCString()

  return [
    `${10 + n * 2}/entries/other${n}/create/v2.1 {"feedId":"543","data":{"guid":"o${n}","title":"Other ${n}","pubDate":"${date}"}}`,
    `${11 + n * 2}/entries/other${n}/markRead/v2.1`
  ].join('\n  ')
}).join('\n  ')

const seed = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
  3/entries/kept/create/v2.1 {"feedId":"543","data":{"guid":"1","title":"Kept entry","pubDate":"${new Date(1600000000000).toUTCString()}"}}
  ${OTHERS}
`

// Roll up is offered as the tidy-up. Throwing away the one thing a reader
// explicitly asked to keep is not tidying.
describe('Roll up an identity with something saved', () => {
  let app

  beforeEach(async () => {
    app = await mountApp({ state: { abc123: { config: {}, data: seed } } })

    await app.click('[aria-label="Save kept"]')
    await app.click('[aria-label="Mark as read kept"]')
    await app.click('[aria-label="You"]')
    await app.click('[aria-label="Roll up identity"]')
  })

  story('keeps an entry that was saved even though it had been read', async () => {
    await app.click('[aria-label="You"]')
    await app.click('[aria-label="Saved entries"]')

    expect(app.findAll('[aria-label="Entry title"]').map((el) => el.text())).toEqual(['Kept entry'])
  })
})

describe('Roll up an identity', () => {
  let app

  beforeEach(async () => {
    app = await mountApp()

    await app.click('[aria-label="You"]')
    await app.click('[aria-label="Roll up identity"]')
  })

  test('replaces the events with a projection', () => {
    expect(app.vm.state.events.length).toEqual(1)
  })

  test('redirects back to the home page', () => {
    expect(app.find('[aria-label="Page title"]').text()).toEqual('Follow Along')
  })

  test('preserves the entries', async () => {
    await app.vm.$router.push('/signals/read')
    await app.wait()

    expect(app.find('[aria-label="Entry title"]').text()).toEqual('Twitter is done. Long live RSS.')
  })

  test('preserves the signals', async () => {
    await app.vm.$router.push('/signals/read')
    await app.wait()

    expect(app.find('[aria-label="Page title"]').text()).toEqual('Read')
  })

  test('preserves the feeds', async () => {
    await app.click('[aria-label="Feeds"]')
    await app.click('[aria-label="Visit Changelog feed"]')

    expect(app.find('[aria-label="Page title"]').text()).toEqual('Changelog')
  })

  event('identities.rollup', {
    data: {
      identity: {}
      // entries: [], should be pruned
      // signals: []
    }
  }, () => { return { app } })
})
