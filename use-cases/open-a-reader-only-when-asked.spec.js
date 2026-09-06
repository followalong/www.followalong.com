import { mountApp, describe, story } from './helper.js'
import EntryReader from '../src/app/components/entry-reader/component.vue'

const CONTENT = 'This is an entry that has long content. '.repeat(8)

const seed = () => {
  const lines = [
    '0/identities/abc123/create/v2.1 {"name":"My Account"}',
    '1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}',
    '2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}'
  ]

  for (let i = 0; i < 12; i++) {
    lines.push(`${3 + i}/entries/e${i}/create/v2.1 ${JSON.stringify({
      feedId: '543',
      data: { guid: `e${i}`, title: `Entry ${i}`, content: CONTENT }
    })}`)
  }

  return lines.join('\n')
}

// Every card used to carry a reader, and a reader is a sheet inside a
// transition. On a long feed that is three components per entry standing by
// for a screen almost none of them will ever show.
describe('Open a reader only when asked', () => {
  let app

  const readers = () => app.findAllComponents(EntryReader)

  beforeEach(async () => {
    app = await mountApp({
      fetch: () => Promise.resolve({ status: 304, body: '' }),
      state: { abc123: { config: {}, data: seed() } },
      path: '/https://foo.bar/rss.xml'
    })
  })

  story('builds no readers for a feed nobody has opened one on', () => {
    expect(app.findAll('article').length).toEqual(12)
    expect(readers().length).toEqual(0)
  })

  describe('Opening one', () => {
    beforeEach(async () => {
      await app.click('[aria-label="Toggle entry content e4"]')
    })

    story('builds the one that was asked for, and only that one', () => {
      expect(readers().length).toEqual(1)
    })

    story('shows the entry', () => {
      expect(app.find('[aria-label="Content for e4"]').text()).toContain('long content')
    })

    describe('and closing it again', () => {
      beforeEach(async () => {
        await app.click('[data-sheet-close]')
      })

      story('takes the content away', () => {
        expect(app.find('[aria-label="Content for e4"]').exists()).toEqual(false)
      })

      // The sheet slides out rather than vanishing, and a component removed on
      // the way to closed has nothing left to run the leave transition.
      story('keeps the reader so it can slide out', () => {
        expect(readers().length).toEqual(1)
      })
    })
  })
})
