import { mountApp, describe, story, test } from './helper.js'

// Entries marked read before v2.3 carry the action `read`, not `markRead`.
// Those events are already on real users' disks, so they must keep replaying.
describe('Read entries recorded before v2.3', () => {
  const readEntryId = '6363'
  const unreadEntryId = '6364'

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
            3/entries/${readEntryId}/create/v2.1 {"feedId":"543","data":{"guid":"987","title":"Was read"}}
            4/entries/${unreadEntryId}/create/v2.1 {"feedId":"543","data":{"guid":"988","title":"Was never read"}}
            5/entries/${readEntryId}/read/v2.1
          `
        }
      }
    })
  })

  story('still shows the entry as read', () => {
    expect(app.findAll(`[aria-label="Mark as unread ${readEntryId}"]`).length).toEqual(1)
  })

  test('leaves the untouched entry unread', () => {
    expect(app.findAll(`[aria-label="Mark as read ${unreadEntryId}"]`).length).toEqual(1)
  })
})
