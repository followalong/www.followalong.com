import { mountApp, describe, story } from './helper.js'

// A YouTube channel feed carries no picture of the channel, so the Feeds page
// borrows the latest video's thumbnail rather than showing an initial.
describe('See a video feed\'s thumbnail', () => {
  let app

  beforeEach(async () => {
    app = await mountApp({
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/feeds/aaa/create/v2.1 {"url":"https://www.youtube.com/feeds/videos.xml?channel_id=UCX","data":{"title":"Linus Tech Tips"}}
            2/entries/e1/create/v2.1 {"feedId":"aaa","data":{"id":"yt:video:old","published":"2026-09-01T00:00:00+00:00","media:group":{"media:thumbnail":{"@_url":"https://i1.ytimg.com/vi/old/hqdefault.jpg"}}}}
            3/entries/e2/create/v2.1 {"feedId":"aaa","data":{"id":"yt:video:new","published":"2026-09-12T00:00:00+00:00","media:group":{"media:thumbnail":{"@_url":"https://i1.ytimg.com/vi/new/hqdefault.jpg"}}}}
          `
        }
      },
      path: '/following'
    })
  })

  story('shows the latest video\'s thumbnail on the feed row', () => {
    const row = app.find('[aria-label="Visit Linus Tech Tips feed"]')

    expect(row.find('img').attributes('src')).toEqual('https://i1.ytimg.com/vi/new/hqdefault.jpg')
  })
})
