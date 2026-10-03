import { describe, test, expect } from 'vitest'
import { feedUrlInPage } from './feed-discovery.js'

describe('feedUrlInPage', () => {
  test('reads the first feed a page names, absolute against the page', () => {
    const html = `<html><head>
      <link rel="stylesheet" href="/style.css">
      <link rel="alternate" type="application/rss+xml" title="Posts" href="/feed.xml">
      <link rel="alternate" type="application/atom+xml" href="https://example.com/atom.xml">
    </head></html>`

    expect(feedUrlInPage(html, 'https://example.com/blog/')).toEqual('https://example.com/feed.xml')
  })

  test('takes atom and json feeds, in any attribute order and quoting', () => {
    expect(feedUrlInPage('<link href=\'atom.xml\' type=\'application/atom+xml\' rel=\'alternate\'>', 'https://example.com/a/b')).toEqual('https://example.com/a/atom.xml')
    expect(feedUrlInPage('<LINK TYPE="application/feed+json" REL="alternate" HREF="/feed.json">', 'https://example.com/')).toEqual('https://example.com/feed.json')
    expect(feedUrlInPage('<link rel="alternate" type="application/rss+xml" href="/feed?a=1&amp;b=2">', 'https://example.com/')).toEqual('https://example.com/feed?a=1&b=2')
  })

  test('ignores alternates that are not feeds', () => {
    const html = '<link rel="alternate" hreflang="fr" href="/fr/"><link rel="alternate" type="application/json+oembed" href="/oembed">'

    expect(feedUrlInPage(html, 'https://example.com/')).toBeUndefined()
  })

  test('reads a YouTube page\'s channel id, with or without a feed link', () => {
    const feed = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCXuqSBlHAE6Xw-yeJA0Tunw'

    expect(feedUrlInPage(`<link rel="alternate" type="application/rss+xml" href="${feed}">`, 'https://www.youtube.com/@handle')).toEqual(feed)
    expect(feedUrlInPage('<meta itemprop="channelId" content="UCXuqSBlHAE6Xw-yeJA0Tunw">', 'https://www.youtube.com/@handle')).toEqual(feed)
    expect(feedUrlInPage('<link rel="canonical" href="https://www.youtube.com/channel/UCXuqSBlHAE6Xw-yeJA0Tunw">', 'https://www.youtube.com/c/name')).toEqual(feed)
    expect(feedUrlInPage('<script>var ytInitialData = {"channelId":"UCXuqSBlHAE6Xw-yeJA0Tunw","title":"x"}</script>', 'https://www.youtube.com/watch?v=xyz')).toEqual(feed)
    expect(feedUrlInPage('<script>{"channelId":"UCXuqSBlHAE6Xw-yeJA0Tunw"}</script>', 'https://m.youtube.com/playlist?list=PL1')).toEqual(feed)
  })

  test('does not read a channel id off a page that is not YouTube', () => {
    expect(feedUrlInPage('<script>{"channelId":"UCXuqSBlHAE6Xw-yeJA0Tunw"}</script>', 'https://example.com/')).toBeUndefined()
  })

  test('has nothing for a page naming no feed, or no page at all', () => {
    expect(feedUrlInPage('<html><body><p>hi</p></body></html>', 'https://example.com/')).toBeUndefined()
    expect(feedUrlInPage('', 'https://example.com/')).toBeUndefined()
    expect(feedUrlInPage(undefined, 'https://example.com/')).toBeUndefined()
    expect(feedUrlInPage('<link rel="alternate" type="application/rss+xml" href="/feed">', 'not a url')).toBeUndefined()
  })
})
