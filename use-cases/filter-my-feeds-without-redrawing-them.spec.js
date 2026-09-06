import { mountApp, describe, story } from './helper.js'
import Queries from '../src/queries/index.js'

const FEEDS = 60

const seed = () => {
  const lines = [
    '0/identities/abc123/create/v2.1 {"name":"My Account"}',
    '1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}'
  ]

  for (let f = 0; f < FEEDS; f++) {
    lines.push(`${2 + f}/feeds/f${f}/create/v2.1 ${JSON.stringify({
      url: `https://foo.bar/${f}.xml`,
      data: { title: `Feed ${f}`, image: { url: `https://foo.bar/art${f}.png` } }
    })}`)
  }

  return lines.join('\n')
}

// Every row's leading and trailing slot closed over the loop variable, which
// Vue has to treat as unstable: it cannot skip a child whose slots might have
// changed, so every row re-rendered whenever the list did. A poll writing one
// fetched event per feed did it too, every five minutes, for a page whose
// pixels do not move.
describe('Filter my feeds without redrawing them', () => {
  let app
  let asked

  // On the prototype, and installed before anything mounts. Replacing the
  // method on the Queries instance would be a write to a reactive object and
  // would itself invalidate every computed that had read it, which looks
  // exactly like the redraw this spec is here to catch.
  const original = Queries.prototype.imageForFeed

  beforeEach(async () => {
    asked = 0
    Queries.prototype.imageForFeed = function (feed) {
      asked++
      return original.call(this, feed)
    }

    app = await mountApp({
      fetch: () => Promise.resolve({ status: 304, body: '' }),
      state: { abc123: { config: {}, data: seed() } },
      path: '/following'
    })

    asked = 0
  })

  afterEach(() => {
    Queries.prototype.imageForFeed = original
  })

  story('draws a row per feed', () => {
    expect(app.findAll('[aria-label^="Visit"]').length).toEqual(FEEDS)
  })

  describe('Typing a character that narrows nothing away', () => {
    beforeEach(async () => {
      await app.find('input[type="text"]').setValue('Feed')
      await app.wait()
    })

    story('leaves every row where it is', () => {
      expect(app.findAll('[aria-label^="Visit"]').length).toEqual(FEEDS)
    })

    story('does not ask every feed for its artwork again', () => {
      expect(asked).toEqual(0)
    })
  })

  describe('A poll marking every feed fetched', () => {
    beforeEach(async () => {
      app.vm.queries.feedsForIdentity(app.vm.identity).forEach((feed) => {
        app.vm.state.track(app.vm.identity.id, 'feeds', feed.id, 'fetched', { at: Date.now() })
      })
      await app.wait()
    })

    story('does not redraw the rows', () => {
      expect(asked).toEqual(0)
    })
  })
})
