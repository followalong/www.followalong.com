import { mountApp, describe, responses, story } from './helper.js'

describe('Visit the primary signal', () => {
  let app

  const expectedSignal = {
    title: 'My signal',
    permalink: 'my-signal'
  }

  beforeEach(async () => {
    app = await mountApp({
      fetch: responses([
        '<changelog></changelog>',
        '<feed><entry><id>123</id><title>Entry title</title></entry></feed>'
      ]),
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/feeds/feed-1/create/v2.1 {"url":"http://foo.bar/rss.xml"}
            2/entries/entries-1/create/v2.1 {"feedId":"feed-1","data":{"guid":"987","title":"Entry title"}}
            3/signals/signals-2/create/v2.1 {"data":{"title":"Another signal","permalink":"another","order":"1"}}
            4/signals/signals-1/create/v2.1 {"data":{"title":"${expectedSignal.title}","permalink":"${expectedSignal.permalink}","order":"0"}}
          `
        }
      }
    })
  })

  story('redirects to the primary signal', () => {
    expect(app.find('[aria-label="Page title"]').text()).toEqual(expectedSignal.title)
    expect(app.find('[aria-label="Page title"]').text()).toEqual(expectedSignal.title)
  })
})
