import { mountApp, describe, story, event } from './helper.js'

describe('Catch up on a feed', () => {
  const entryId = '6363'

  let app

  beforeEach(async () => {
    app = await mountApp({
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
            2/entries/6363/create/v2.1 {"feedId":"543","data":{"guid":"987","title":"Entry title"}}
          `
        }
      }
    })

    await app.click('[aria-label="Feed link"]')
    await app.click('[aria-label="Show menu"]')
    await app.click('[aria-label="Catch up on feed"]')
  })

  story('toggles the marker', () => {
    expect(app.findAll(`[aria-label="Mark as unread ${entryId}"]`).length).toEqual(1)
  })

  event('entries.read', {
    objectId: entryId
  }, () => { return { app } })
})
