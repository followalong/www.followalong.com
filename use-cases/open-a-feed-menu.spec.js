import { mountApp, describe, responses, story } from './helper.js'

describe('Open a feed menu', () => {
  const feed = { id: '543', title: 'Feed Title', url: 'https://foo.bar/feed.xml' }

  let app

  beforeEach(async () => {
    app = await mountApp({
      path: `/${feed.url}`,
      fetch: responses([`<feed><title>${feed.title}</title></feed>`]),
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/feeds/${feed.id}/create/v2.1 {"url":"${feed.url}","data":{"title":"${feed.title}"}}
          `
        }
      }
    })
  })

  story('puts the menu in the bar, beside search', () => {
    expect(app.findAll('[data-bar-slot] [aria-label="Feed menu"]').length).toEqual(1)
    expect(app.findAll('[data-bar-slot] [aria-label="Open search"]').length).toEqual(1)
  })

  // The address is a developer's detail above someone else's writing. It is
  // still in the menu, on the row that copies it.
  story('keeps the address out of the page', () => {
    expect(app.text()).not.toContain(feed.url)
  })

  story('has it in the menu instead', async () => {
    await app.click('[aria-label="Feed menu"]')

    expect(app.text()).toContain(feed.url)
  })

  // The bar belongs to the shell and outlives the page, so a menu left behind
  // would open a sheet for a feed nobody is looking at.
  story('takes the menu away on the way out', async () => {
    await app.click('[aria-label="Feeds"]')

    expect(app.findAll('[aria-label="Feed menu"]').length).toEqual(0)
  })
})
