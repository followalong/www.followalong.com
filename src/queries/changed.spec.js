import { describe, test, expect } from 'vitest'
import Queries from './index.js'

// Whether a poll's response is worth recording an update for. It walks the
// nested shapes a feed sends, and a YouTube entry nests two levels deep.
describe('Deciding an entry changed', () => {
  const queries = new Queries({})

  const THUMBNAIL = { 'media:group': { 'media:thumbnail': { '@_url': 'https://i.ytimg.com/vi/abc/hqdefault.jpg' } } }

  test('says an entry gained data when a nested shape it never had arrives', () => {
    const entry = { data: { title: 'A video' } }

    expect(queries.entryChanged(entry, Object.assign({ title: 'A video' }, THUMBNAIL))).toBe(true)
  })

  test('says nothing changed when the same nested shape comes back', () => {
    const entry = { data: Object.assign({ title: 'A video' }, THUMBNAIL) }

    expect(queries.entryChanged(entry, Object.assign({ title: 'A video' }, THUMBNAIL))).toBe(false)
  })

  test('says an entry changed when a nested value it already had is different', () => {
    const entry = { data: Object.assign({ title: 'A video' }, THUMBNAIL) }
    const fresh = { title: 'A video', 'media:group': { 'media:thumbnail': { '@_url': 'https://i.ytimg.com/vi/xyz/hqdefault.jpg' } } }

    expect(queries.entryChanged(entry, fresh)).toBe(true)
  })

  // Views and ratings move every few minutes. Treating those as a change
  // would rewrite every YouTube entry on every poll, forever.
  test('ignores the view and rating counts, even arriving for the first time', () => {
    const entry = { data: { title: 'A video' } }
    const fresh = {
      title: 'A video',
      'media:group': {
        'media:community': {
          'media:starRating': { '@_count': '12' },
          'media:statistics': { '@_views': '3400' }
        }
      }
    }

    expect(queries.entryChanged(entry, fresh)).toBe(false)
  })

  test('still notices a real change alongside churning counts', () => {
    const entry = { data: { title: 'A video' } }
    const fresh = {
      title: 'A video',
      'media:group': {
        'media:thumbnail': { '@_url': 'https://i.ytimg.com/vi/abc/hqdefault.jpg' },
        'media:community': { 'media:statistics': { '@_views': '3400' } }
      }
    }

    expect(queries.entryChanged(entry, fresh)).toBe(true)
  })
})

describe('Deciding a feed changed', () => {
  const queries = new Queries({})

  test('says a feed gained data when a nested shape it never had arrives', () => {
    const feed = { data: { title: 'A channel' } }
    const fresh = { title: 'A channel', image: { url: 'https://example.com/icon.png' } }

    expect(queries.feedChanged(feed, fresh)).toBe(true)
  })

  test('says nothing changed when the same nested shape comes back', () => {
    const feed = { data: { title: 'A channel', image: { url: 'https://example.com/icon.png' } } }
    const fresh = { title: 'A channel', image: { url: 'https://example.com/icon.png' } }

    expect(queries.feedChanged(feed, fresh)).toBe(false)
  })
})
