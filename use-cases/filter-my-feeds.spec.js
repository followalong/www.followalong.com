import { mountApp, describe, story } from './helper.js'

describe('Filter my feeds', () => {
  let app

  beforeEach(async () => {
    app = await mountApp({
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/feeds/aaa/create/v2.1 {"url":"https://one.example.com/feed.xml","data":{"title":"Daring Fireball"}}
            2/feeds/bbb/create/v2.1 {"url":"https://two.example.com/feed.xml","data":{"title":"The Changelog"}}
            3/feeds/ccc/create/v2.1 {"url":"https://three.example.com/feed.xml","data":{"title":"Fireside Chats"}}
          `
        }
      }
    })

    await app.click('[aria-label="Feeds"]')
  })

  story('shows every feed until I type', () => {
    expect(app.text()).toContain('Daring Fireball')
    expect(app.text()).toContain('The Changelog')
    expect(app.text()).toContain('Fireside Chats')
  })

  story('narrows the list to titles that match, whatever the case', async () => {
    await app.find('[aria-label="Filter feeds"]').setValue('fire')
    await app.wait()

    expect(app.text()).toContain('Daring Fireball')
    expect(app.text()).toContain('Fireside Chats')
    expect(app.text()).not.toContain('The Changelog')
  })

  // Typing something with no match is a different situation from following
  // nothing at all, and saying the wrong one of those is confusing.
  story('says nothing matched rather than pretending I follow nothing', async () => {
    await app.find('[aria-label="Filter feeds"]').setValue('nonsense')
    await app.wait()

    expect(app.text()).toContain('No feeds match')
    expect(app.text()).not.toContain('not following any feeds yet')
  })

  story('gives every feed back when I clear it', async () => {
    await app.find('[aria-label="Filter feeds"]').setValue('fire')
    await app.wait()
    await app.click('[aria-label="Clear search"]')

    expect(app.text()).toContain('The Changelog')
  })
})
