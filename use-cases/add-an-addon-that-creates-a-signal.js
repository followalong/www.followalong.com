import { mountApp, describe, responses, story, event } from './helper.js'

describe('Add an addon that creates a signal', () => {
  let app

  beforeEach(async () => {
    app = await mountApp()

    await app.click('[aria-label="Add-ons"]')
    await app.click('[aria-label="Go to marketplace"]')
  })

  story('creates the signal', async () => {
    expect(app.find(`[aria-label="Unfollow ${expectedFeed.title}"]`).text()).toEqual('Following')
  })

  event('feeds.create', {
    data: {
      url: expectedFeed.url,
      data: {
        title: expectedFeed.title
      }
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
