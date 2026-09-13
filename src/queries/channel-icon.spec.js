import { describe, test, expect } from 'vitest'
import { isVideoFeedUrl, channelUrlForFeed, ogImage } from './channel-icon.js'

describe('isVideoFeedUrl', () => {
  test('knows the three video hosts', () => {
    expect(isVideoFeedUrl('https://www.youtube.com/feeds/videos.xml?channel_id=UCX')).toEqual(true)
    expect(isVideoFeedUrl('https://api.bitchute.com/feeds/rss/channel/bitchute/')).toEqual(true)
    expect(isVideoFeedUrl('https://rumble.com/c/name/rss')).toEqual(true)
  })

  test('leaves every other feed alone', () => {
    expect(isVideoFeedUrl('https://foo.bar/feed.xml')).toEqual(false)
    expect(isVideoFeedUrl('https://notyoutube.com/feed')).toEqual(false)
    expect(isVideoFeedUrl('https://youtube.com.evil.example/feed')).toEqual(false)
    expect(isVideoFeedUrl(undefined)).toEqual(false)
    expect(isVideoFeedUrl('not a url')).toEqual(false)
  })
})

describe('channelUrlForFeed', () => {
  test('reads the author uri a YouTube feed carries', () => {
    const data = {
      link: [{ '@_rel': 'self', '@_href': 'http://www.youtube.com/feeds/videos.xml?channel_id=UCX' }, { '@_rel': 'alternate', '@_href': 'https://www.youtube.com/channel/UCX' }],
      author: { name: 'Linus', uri: 'https://www.youtube.com/channel/UCX' }
    }

    expect(channelUrlForFeed(data)).toEqual('https://www.youtube.com/channel/UCX')
  })

  test('falls back to the alternate link', () => {
    const data = { link: [{ '@_rel': 'alternate', '@_href': 'https://www.youtube.com/channel/UCX' }] }

    expect(channelUrlForFeed(data)).toEqual('https://www.youtube.com/channel/UCX')
  })

  test('reads the plain link an RSS channel carries', () => {
    expect(channelUrlForFeed({ link: 'https://api.bitchute.com/channel/bitchute/' })).toEqual('https://api.bitchute.com/channel/bitchute/')
  })

  test('has nothing for a feed that names no channel', () => {
    expect(channelUrlForFeed({ title: 'A' })).toBeUndefined()
    expect(channelUrlForFeed(undefined)).toBeUndefined()
  })
})

describe('ogImage', () => {
  test('reads a quoted og:image', () => {
    const html = '<html><head><meta property="og:title" content="X"><meta property="og:image" content="https://yt3.googleusercontent.com/abc=s900"></head></html>'

    expect(ogImage(html)).toEqual('https://yt3.googleusercontent.com/abc=s900')
  })

  test('reads it when content comes first, single-quoted, self-closed', () => {
    const html = "<meta content='https://static-3.bitchute.com/live/channel_images/a/b_medium.jpg' property='og:image' />"

    expect(ogImage(html)).toEqual('https://static-3.bitchute.com/live/channel_images/a/b_medium.jpg')
  })

  test('reads the unquoted form Rumble serves', () => {
    const html = '<meta property=og:image content=https://hugh.cdn.rumble.cloud/video/z8/U/K/d/b/UKdba.png>'

    expect(ogImage(html)).toEqual('https://hugh.cdn.rumble.cloud/video/z8/U/K/d/b/UKdba.png')
  })

  test('decodes an ampersand in the address', () => {
    expect(ogImage('<meta property="og:image" content="https://a.example/i.png?w=1&amp;h=2">')).toEqual('https://a.example/i.png?w=1&h=2')
  })

  test('has nothing for a page without one', () => {
    expect(ogImage('<html><head><meta property="og:title" content="X"></head></html>')).toBeUndefined()
    expect(ogImage('')).toBeUndefined()
    expect(ogImage(undefined)).toBeUndefined()
  })
})
