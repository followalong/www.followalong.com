import { mountApp, describe, responses, story, event } from './helper.js'

describe('Add an addon that creates a signal', () => {
  let app

  const expectedAddon = {

  }

  beforeEach(async () => {
    app = await mountApp()

    await app.click('[aria-label="Add-ons"]')
    await app.click('[aria-label="Go to marketplace"]')
    await app.find(`[aria-label="Add ${expectedAddon.title}"]`)
  })

  story('creates the signal', async () => {
    expect(app.find(`[aria-label="Add ${expectedAddon.title}"]`).text()).toEqual('Following')
  })

  event('addons.create', {
    data: {
      url: expectedFeed.url
    }
  }, () => { return { app } })

  event('entries.create', {
    data: {
      data: {
        title: expectedFeed.entries[0].title
      }
    }
  }, () => { return { app } })
})
