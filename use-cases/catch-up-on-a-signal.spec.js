import { mountApp, describe, story, event } from './helper.js'

describe('Catch up on a signal', () => {
  let app

  beforeEach(async () => {
    app = await mountApp()

    await app.vm.$router.push('/signals/read')
    await app.wait()
    await app.click('[aria-label="Catch up on signal"]')
  })

  story('toggles the marker', () => {
    expect(app.findAll('[aria-label^="Mark as unread"]').length).toEqual(1)
  })

  event('entries.markRead', {}, () => { return { app } })
})
