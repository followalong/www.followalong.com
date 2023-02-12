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
            1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
            2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
            3/entries/6363/create/v2.1 {"feedId":"543","data":{"guid":"987","title":"Entry title"}}
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
