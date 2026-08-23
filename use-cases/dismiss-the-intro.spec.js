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
