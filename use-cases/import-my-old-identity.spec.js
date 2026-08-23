import { mountApp, describe, story, test } from './helper.js'

const LEGACY = {
  id: 'old',
  name: 'My Account',
  feeds: [
    { id: 'fa', name: 'Already Here', url: 'https://foo.bar/rss.xml', updatedAt: 1000 },
    { id: 'fb', name: 'Recovered Feed', url: 'https://recovered.example/rss', updatedAt: 1100 }
  ],
  items: [
    { id: 'i1', guid: '987', feedUrl: 'https://foo.bar/rss.xml', title: 'Entry title', pubDate: 'Mon, 01 May 2023 00:00:00 GMT', savedAt: 5000, updatedAt: 2000 },
    { id: 'i2', guid: 'https://recovered.example/a', link: 'https://recovered.example/a', feedUrl: 'https://recovered.example/rss', title: 'Recovered Entry', pubDate: 'Tue, 02 May 2023 00:00:00 GMT', savedAt: 6000, updatedAt: 2100 }
  ]
}

describe('Import my old identity', () => {
  let app

  beforeEach(async () => {
    app = await mountApp({
      path: '/settings',
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
            2/signals/135/create/v2.3 {"data":{"title":"Saved","permalink":"saved","order":"5","filter":"(queries) => { return (entry) => queries.isEntrySaved(entry) }"}}
            3/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Already Here"}}
            4/entries/6363/create/v2.1 {"feedId":"543","data":{"guid":"987","title":"Entry title"}}
          `
        }
      }
    })

    const file = new File([JSON.stringify(LEGACY)], 'followalong.json', { type: 'application/json' })
    const input = app.find('[aria-label="Import identity file"]')

    Object.defineProperty(input.element, 'files', { value: [file] })

    await input.trigger('change')
    await app.wait()
  })

  story('says what it brought in', () => {
    const result = app.find('[aria-label="Import result"]').text()

    expect(result).toContain('1 new feed')
    expect(result).toContain('1 entry')
    expect(result).toContain('1 feed was already here')
  })

  test('recovers the feed that was missing without duplicating the one here', () => {
    const titles = app.vm.queries.feedsForIdentity(app.vm.identity)
      .map((feed) => app.vm.queries.titleForFeed(feed))

    expect(titles.filter((t) => t === 'Already Here').length).toEqual(1)
    expect(titles).toContain('Recovered Feed')
  })

  test('shows both saved entries under Saved', async () => {
    await app.click('[aria-label="Visit Saved"]')

    const titles = app.findAll('[aria-label="Entry title"]').map((el) => el.text())

    expect(titles.sort()).toEqual(['Entry title', 'Recovered Entry'])
  })
})
