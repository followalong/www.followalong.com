import { mountApp, describe, story } from './helper.js'

describe('Mark entry as read', () => {
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
            2/entries/${entryId}/create/v2.1 {"feedId":"543","data":{"guid":"987","title":"Entry title"}}
          `
        }
      }
    })

    await app.click(`[aria-label="Mark as read ${entryId}"]`)
  })

  story('toggles the marker', () => {
    expect(app.findAll(`[aria-label="Mark as unread ${entryId}"]`).length).toEqual(1)
  })

  // event('entries.read', {
  //   collection: 'entries',
  //   action: 'read',
  //   objectId: entryId
  // }, () => { return { app } })
})
