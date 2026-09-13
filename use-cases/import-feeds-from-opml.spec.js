import { mountApp, describe, story, event } from './helper.js'

const OPML = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>Feeds from reader.dallasread.com</title></head>
  <body>
    <outline text="Folder title">
      <outline type="rss" text="Feed title" title="Feed title" xmlUrl="https://example.com/feed.xml"/>
    </outline>
    <outline type="rss" text="Unfiled feed" title="Unfiled feed" xmlUrl="https://example.com/other.xml"/>
  </body>
</opml>`

const MORE = `<opml version="2.0"><body>
  <outline type="rss" text="Feed title" xmlUrl="https://example.com/feed.xml"/>
  <outline type="rss" text="A third feed" xmlUrl="https://example.com/third.xml"/>
</body></opml>`

describe('Import feeds from OPML', () => {
  let app

  const importOpml = async (text) => {
    await app.click('[aria-label="Import feeds"]')
    await app.find('[aria-label="OPML to import"]').setValue(text)
    await app.click('[aria-label="Follow these feeds"]')
  }

  const feedUrls = () => app.vm.queries.feedsForIdentity(app.vm.identity).map((f) => f.url).sort()

  beforeEach(async () => {
    app = await mountApp({
      state: {
        abc123: {
          config: {},
          data: '0/identities/abc123/create/v2.1 {"name":"My Account"}'
        }
      }
    })

    await app.click('[aria-label="You"]')
    await importOpml(OPML)
  })

  story('follows every feed in the file', async () => {
    expect(app.text()).toContain('Followed 2 feeds')
    expect(feedUrls()).toEqual(['https://example.com/feed.xml', 'https://example.com/other.xml'])

    await app.click('[aria-label="Feeds"]')

    expect(app.find('[aria-label="Visit Feed title feed"]').exists()).toBe(true)
    expect(app.find('[aria-label="Visit Unfiled feed feed"]').exists()).toBe(true)
  })

  story('skips a feed I already follow, and says so', async () => {
    await importOpml(MORE)

    expect(app.text()).toContain('Followed 1 feed, 1 already followed')
    expect(feedUrls()).toEqual(['https://example.com/feed.xml', 'https://example.com/other.xml', 'https://example.com/third.xml'])
  })

  story('refuses text that is not OPML', async () => {
    await importOpml('just some notes')

    expect(app.text()).toContain('does not look like an OPML file')
    expect(feedUrls()).toHaveLength(2)
  })

  event('feeds.create', {
    data: {
      url: 'https://example.com/feed.xml',
      data: { title: 'Feed title' }
    }
  }, () => { return { app } })

  event('feeds.create', {
    data: {
      url: 'https://example.com/other.xml',
      data: { title: 'Unfiled feed' }
    }
  }, () => { return { app } })
})
