import { mountApp, describe, story, event } from './helper.js'

describe('Catch up on a signal', () => {
  let app

  beforeEach(async () => {
    app = await mountApp()

    await app.click('[aria-label="Visit Read"]')
    await app.click('[aria-label="Show menu"]')
    await app.click('[aria-label="Catch up on signal"]')
  })

  story('toggles the marker', () => {
    expect(app.findAll('[aria-label^="Mark as unread"]').length).toEqual(1)
  })

  event('entries.read', {
    collection: 'entries',
    action: 'read'
  }, () => { return { app } })
})
