// Video hosts publish feeds that name no picture of the channel. The channel
// page does, as og:image, so these are the feeds worth asking a page for.
const VIDEO_HOSTS = ['youtube.com', 'rumble.com', 'bitchute.com']

const isVideoFeedUrl = (url) => {
  let host

  try {
    host = new URL(url).hostname
  } catch (e) {
    return false
  }

  return VIDEO_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
}

// YouTube Atom names the channel in author/uri and a rel=alternate link; an
// RSS channel (BitChute, a generated Rumble feed) names it in a plain link.
const channelUrlForFeed = (data) => {
  data = data || {}

  const links = [].concat(data.link || [])
  const alternate = links.find((l) => l && l['@_rel'] === 'alternate')

  return (data.author || {}).uri ||
    (alternate && alternate['@_href']) ||
    links.find((l) => typeof l === 'string')
}

const META = /<meta\s[^>]*>/gi
const ATTR = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g

// Attribute order is not fixed, and Rumble quotes nothing, so the tag is
// read attribute by attribute rather than matched as one shape.
const ogImage = (html) => {
  for (const [tag] of `${html || ''}`.matchAll(META)) {
    const attrs = {}

    for (const [, name, dq, sq, bare] of tag.matchAll(ATTR)) {
      attrs[name.toLowerCase()] = dq ?? sq ?? bare
    }

    if (attrs.property === 'og:image' && attrs.content) {
      return attrs.content.replace(/&amp;/g, '&')
    }
  }
}

export { isVideoFeedUrl, channelUrlForFeed, ogImage }
