import { mountApp, describe, test, responses, story } from './helper.js'

describe('Skip entries older than what I have read', () => {
  const feedUrl = 'https://foo.bar/rss.xml'

  let app

  beforeEach(async () => {
    app = await mountApp({
      fetch: responses([`
        <feed>
          <title>Feed title</title>
          <entry>
            <id>older-than-read</id>
            <title>Older entry</title>
            <published>2023-01-01T00:00:00Z</published>
          </entry>
          <entry>
            <id>newer-than-read</id>
            <title>Newer entry</title>
            <published>2023-12-01T00:00:00Z</published>
          </entry>
        </feed>
      `]),
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
            2/feeds/543/create/v2.1 {"url":"${feedUrl}","data":{"title":"Feed title"}}
            3/entries/6363/create/v2.1 {"feedId":"543","data":{"guid":"987","title":"Seed entry","published":"2023-06-01T00:00:00Z"}}
            4/entries/6363/read/v2.1
          `
        }
      }
    })

    await app.click('[aria-label="Feed link"]')
  })

  story('leaves entries newer than my last read entry unread', () => {
    const unread = app.findAll('[aria-label^="Mark as read"]')

    expect(unread.length).toEqual(1)
  })

  test('arrives already read for entries older than my last read entry', () => {
    const titles = app.findAll('[aria-label="Entry title"]').map((el) => el.text())

    expect(titles).toContain('Older entry')
    expect(app.findAll('[aria-label^="Mark as unread"]').length).toEqual(2)
  })
})
