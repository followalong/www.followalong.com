import { mountApp, describe, story, event } from './helper.js'

describe('Pause a feed', () => {
  let app

  beforeEach(async () => {
    app = await mountApp({
      path: '/https://changelog.followalong.com/feed.xml'
    })

    await app.click('[aria-label="Show menu"]')
    await app.click('[aria-label="Pause feed"]')
  })

  story('pauses the feed', async () => {
    expect(app.findAll('[aria-label="Unpause feed"]').length).toEqual(1)
  })

  event('feeds.pause', {}, () => { return { app } })
})
