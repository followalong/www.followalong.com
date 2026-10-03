import { mountApp, describe, story, event } from './helper.js'

describe('Dismiss the intro', () => {
  let app

  beforeEach(async () => {
    app = await mountApp({
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1 {"name":"My Account"}
            1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
          `
        }
      }
    })
  })

  story('introduces the app on the river', () => {
    expect(app.text()).toContain('What is Follow Along?')
  })

  story('offers the whole story', async () => {
    await app.click('[aria-label="About Follow Along"]')

    expect(app.text()).toContain('decentraliz')
  })

  // The intro is on screen exactly when a reader has nothing followed but the
  // changelog, so it is where the way to start belongs.
  story('offers the way to start', async () => {
    await app.click('[data-intro] [aria-label="Paste a feed link"]')

    expect(app.find('[data-search-panel]').exists()).toEqual(true)
  })

  story('offers it once, even with nothing followed', () => {
    expect(app.findAll('[aria-label="Paste a feed link"]')).toHaveLength(1)
  })

  story('stays off the saved list', async () => {
    app.vm.$router.push('/signals/saved')
    await app.wait()

    expect(app.text()).not.toContain('What is Follow Along?')
  })

  describe('Dismissing it', () => {
    beforeEach(async () => {
      await app.click('[aria-label="Dismiss intro"]')
    })

    story('takes it off the river', () => {
      expect(app.text()).not.toContain('What is Follow Along?')
    })

    story('remembers for next time', () => {
      expect(app.vm.queries.hintIsShown(app.vm.identity, 'intro')).toEqual(false)
    })

    event('identities.hideHint', {
      objectId: 'abc123',
      data: { hint: 'intro' }
    }, () => { return { app } })
  })
})
