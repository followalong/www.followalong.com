import { mountApp, describe, responses, story } from './helper.js'

describe('Search for a feed', () => {
  const feedTitle = 'Feed title'

  let app

  beforeEach(async () => {
    app = await mountApp({
      fetch: responses([`<feed><title>${feedTitle}</title></feed>`])
    })

    await app.find('[aria-label="Search input"]').setValue('https://foo.bar/rss.xml')
    await app.submit('[aria-label="Search"]')
  })

  story('redirects to the feed page', () => {
    expect(app.find('[aria-label="Page title"]').text()).toEqual(feedTitle)
  })
})
