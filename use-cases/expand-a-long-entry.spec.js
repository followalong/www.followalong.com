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
            1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
            2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
            3/entries/${entryId}/create/v2.1 {"feedId":"543","data":{"guid":"987","title":"Entry title","content":"This is an entry that has long content. This is an entry that has long content. This is an entry that has long content. This is an entry that has long content. This is an entry that has long content. This is an entry that has long content. This is an entry that has long content. This is an entry that has long content. This is an entry that has long content. This is an entry that has long content. This is an entry that has long content."}}
          `
        }
      }
    })

    expect(app.find(`[aria-label="Content for ${entryId}"]`).element.className).toContain('max-h-48')

    await app.click(`[aria-label="Toggle entry content ${entryId}"]`)
  })

  story('shows more content', () => {
    expect(app.find(`[aria-label="Content for ${entryId}"]`).element.className).not.toContain('max-h-48')
    expect(app.find(`[aria-label="Toggle entry content ${entryId}"]`).text()).toEqual('Collapse')
  })
})
