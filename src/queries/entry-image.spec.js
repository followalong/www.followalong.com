import { describe, test, expect } from 'vitest'
import Queries from './index.js'

const queries = new Queries({})
const entry = (data) => ({ data })

describe('imageForEntry', () => {
  // Odysee names the picture in itunes:image and serves it from a CDN path
  // with no file extension, which is the whole of what that feed offers.
  test('takes the thumbnail an itunes:image names', () => {
    expect(queries.imageForEntry(entry({
      'itunes:image': { '@_href': 'https://thumbnails.lbry.com/ln_J7O2bofc' }
    }))).toEqual('https://thumbnails.lbry.com/ln_J7O2bofc')
  })

  test('takes an itunes:image written as text rather than an attribute', () => {
    expect(queries.imageForEntry(entry({
      'itunes:image': 'https://thumbnails.lbry.com/ln_J7O2bofc'
    }))).toEqual('https://thumbnails.lbry.com/ln_J7O2bofc')
  })

  test('takes a media:thumbnail with no extension', () => {
    expect(queries.imageForEntry(entry({
      'media:thumbnail': { '@_url': 'https://cdn.example/t/abc' }
    }))).toEqual('https://cdn.example/t/abc')
  })

  test('prefers a named thumbnail over the entry link', () => {
    expect(queries.imageForEntry(entry({
      link: 'https://example.com/a.jpg',
      'itunes:image': { '@_href': 'https://cdn.example/t/abc' }
    }))).toEqual('https://cdn.example/t/abc')
  })

  // A link or an enclosure can be anything, so those still have to look like
  // a picture before the card will show one.
  test('leaves a link that is a page, not a picture', () => {
    expect(queries.imageForEntry(entry({
      link: 'https://odysee.com/can-i-say-something-terrible:401dc6f2'
    }))).toBeFalsy()
  })

  test('leaves a video enclosure alone', () => {
    expect(queries.imageForEntry(entry({
      enclosure: { '@_url': 'https://odysee.com/$/rss/media/x/5978a1.mp4', '@_type': 'video/mp4' }
    }))).toBeFalsy()
  })

  test('still takes a link that is a picture', () => {
    expect(queries.imageForEntry(entry({
      link: 'https://example.com/a.jpg'
    }))).toEqual('https://example.com/a.jpg')
  })
})
