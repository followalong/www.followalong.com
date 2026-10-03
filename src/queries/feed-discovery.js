// A page is not a feed, but it usually says where its feed is: a <link
// rel="alternate"> of a feed type. A YouTube page names its channel instead,
// and every channel has a feed. Regex, not DOMParser: a channel page is 2.3MB.
import { attributesOf } from './channel-icon.js'

const LINK = /<link\s[^>]*>/gi
const FEED_TYPES = ['application/rss+xml', 'application/atom+xml', 'application/feed+json']

const YOUTUBE_FEED = 'https://www.youtube.com/feeds/videos.xml?channel_id='
const CHANNEL_ID = /UC[\w-]{22}/
const CHANNEL_ID_IN_PAGE = [/"channelId"\s*:\s*"(UC[\w-]{22})"/, /\/channel\/(UC[\w-]{22})/]

const absolute = (href, pageUrl) => {
  try {
    return new URL(href, pageUrl).href
  } catch (e) {
    return undefined
  }
}

const isYouTube = (pageUrl) => {
  try {
    const host = new URL(pageUrl).hostname

    return host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be'
  } catch (e) {
    return false
  }
}

const linkedFeed = (html, pageUrl) => {
  for (const [tag] of html.matchAll(LINK)) {
    const attrs = attributesOf(tag)

    if (attrs.rel === 'alternate' && FEED_TYPES.includes(`${attrs.type || ''}`.toLowerCase()) && attrs.href) {
      return absolute(attrs.href, pageUrl)
    }
  }
}

// The page's own channel first (itemprop, canonical), then the first id in
// the page's data, which is the video's channel on a watch page.
const youTubeChannel = (html) => {
  const meta = html.match(/<meta\s[^>]*itemprop=["']?channelId["']?[^>]*>/i)
  const fromMeta = meta && (attributesOf(meta[0]).content || '').match(CHANNEL_ID)

  if (fromMeta) return fromMeta[0]

  for (const pattern of CHANNEL_ID_IN_PAGE) {
    const found = html.match(pattern)

    if (found) return found[1]
  }
}

const feedUrlInPage = (html, pageUrl) => {
  html = `${html || ''}`

  const linked = linkedFeed(html, pageUrl)

  if (linked) return linked

  const channel = isYouTube(pageUrl) && youTubeChannel(html)

  return channel ? `${YOUTUBE_FEED}${channel}` : undefined
}

export { feedUrlInPage }
