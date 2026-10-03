import { mountApp, describe, story } from './helper.js'

// A reader who follows nothing is not caught up; they have not started. Every
// empty page they can land on says so and offers the one way to start, which
// is the search panel. (That its field takes focus is the panel's own spec.)
describe('Start with nothing followed', () => {
  let app

  const state = {
    abc123: {
      config: {},
      data: `
        0/identities/abc123/create/v2.1 {"name":"My Account"}
        1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
        2/identities/abc123/hideHint/v2.1 {"hint":"intro"}
      `
    }
  }

  describe('on Home', () => {
    beforeEach(async () => {
      app = await mountApp({ state })
    })

    story('says nothing is followed rather than that I am caught up', () => {
      expect(app.text()).toContain('You follow nothing yet')
      expect(app.text()).not.toContain('caught up')
    })

    story('opens search', async () => {
      await app.click('[aria-label="Paste a feed link"]')

      expect(app.find('[data-search-panel]').exists()).toEqual(true)
    })
  })

  describe('on Feeds', () => {
    beforeEach(async () => {
      app = await mountApp({ state, path: '/following' })
    })

    story('offers the same way to start', async () => {
      await app.click('[aria-label="Paste a feed link"]')

      expect(app.find('[data-search-panel]').exists()).toEqual(true)
    })
  })
})
