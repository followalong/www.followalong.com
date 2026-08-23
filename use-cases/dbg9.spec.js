import { mountApp, describe, story } from './helper.js'
describe('dbg9', () => {
  story('renders', async () => {
    const app = await mountApp({
      state: {
        abc123: {
          config: {}, data: `
        0/identities/abc123/create/v2.1 {"name":"My Account"}
        1/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
        2/entries/6363/create/v2.1 {"feedId":"543","data":{"guid":"987","title":"Entry title"}}
      `
        }
      }
    })
    await app.click('[aria-label="You"]')
    console.log('TEXTLEN', app.text().length)
  })
})
