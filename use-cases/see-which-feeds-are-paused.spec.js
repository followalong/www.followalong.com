import { mountApp, describe, story } from './helper.js'

describe('See which feeds are paused', () => {
  let app

  beforeEach(async () => {
    app = await mountApp({
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/feeds/aaa/create/v2.1 {"url":"https://one.example.com/feed.xml","data":{"title":"Resting Feed"}}
            2/feeds/bbb/create/v2.1 {"url":"https://two.example.com/feed.xml","data":{"title":"Busy Feed"}}
            3/feeds/aaa/pause/v2.1
          `
        }
      }
    })

    await app.click('[aria-label="Feeds"]')
  })

  story('marks the paused feed and only that one', () => {
    const paused = app.findAll('[data-paused-badge]')

    expect(paused.length).toEqual(1)
    expect(paused[0].text()).toEqual('Paused')
  })

  story('says so on the row itself, so the list answers it at a glance', () => {
    const row = app.findAll('[aria-label="Visit Resting Feed feed"]')[0]

    expect(row.text()).toContain('Paused')
  })
})
