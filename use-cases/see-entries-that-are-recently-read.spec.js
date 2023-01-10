import { mountApp, describe, story } from './helper.js'

describe('See entries that are recently read', () => {
  let app
  let entry

  beforeEach(async () => {
    app = await mountApp()
    entry = app.vm.queries.entriesForIdentity(app.vm.identity)[0]

    await app.click(`[aria-label="Mark as read ${entry.id}"]`)
    await app.click('[aria-label="Visit Done"]')
  })

  story('shows the read items', () => {
    expect(app.find('[aria-label="Entry title"]').text()).toEqual(entry.data.title)
  })
})
