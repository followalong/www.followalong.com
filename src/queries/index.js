import { XMLParser } from 'fast-xml-parser'
import sanitizeContent from './presenters/sanitize-content.js'

const getAttr = (obj, attr) => {
  obj = obj || {}
  obj = obj.data || {}

  const splat = attr.split('.')
  const last = splat.pop()

  for (var i = 0; i < splat.length; i++) {
    if (typeof obj[splat[i]] === 'string') {
      return obj[splat[i]]
    } else if (typeof obj[splat[i]] === 'object') {
      obj = obj[splat[i]]
    } else {
      return ''
    }
  }

  if (typeof obj !== 'object') {
    return ''
  }

  return obj[last]
}

class Queries {
  constructor (options) {
    for (const key in options) {
      this[key] = options[key]
    }
  }

  allIdentities () {
    return this.state.findAll(null, 'identities')
  }

  entriesForIdentity (identity) {
    return this.state.findAll(identity.id, 'entries')
  }

  entriesForFeed (identity, feed) {
    return this.state.findAll(identity.id, 'entries')
      .filter((e) => e.feedId === feed.id)
  }

  jsonFromXml (xml) {
    const parser = new XMLParser({
      isArray: (name, jpath, isLeafNode, isAttribute) => {
        return ['entry', 'item'].indexOf(name) !== -1
      }
    })
    const json = parser.parse(xml)

    try {
      return json.rss.channel
    } catch (e) { }

    try {
      return json.rss.feed
    } catch (e) { }

    return json.feed || json.channel || json
  }

  keyForEntry (entry) {
    const key = getAttr(entry, 'id') ||
      getAttr(entry, 'guid.href') ||
      getAttr(entry, 'link.href')

    if (key) {
      return key
    }

    throw new Error(`Cannot find a key for ${JSON.stringify(entry)}`)
  }

  entryForFeedForIdentity (identity, feed, key) {
    return this.entriesForFeed(identity, feed)
      .find((e) => this.keyForEntry(e) === key)
  }

  feedForIdentity (identity, feedId) {
    return this.state.findAll(identity.id, 'feeds')
      .find((f) => f.id === feedId)
  }

  feedForIdentityByUrl (identity, feedUrl) {
    return this.state.findAll(identity.id, 'feeds')
      .find((f) => this.urlForFeed(f) === feedUrl)
  }

  latestFeedForIdentity (identity) {
    const feeds = this.state.findAll(identity.id, 'feeds')

    return feeds[feeds.length - 1]
  }

  titleForEntry (entry) {
    return getAttr(entry, 'title')
  }

  urlForFeed (feed) {
    return (feed || {}).url
  }

  linkForFeed (feed) {
    return getAttr(feed, 'link.href') ||
      this.urlForFeed(feed)
  }

  urlForEntry (entry) {
    return getAttr(entry, 'link.href') ||
      getAttr(entry, 'url.href')
  }

  titleForFeed (feed) {
    return getAttr(feed, 'title')
  }

  dateForEntry (entry) {
    return getAttr(entry, 'published') ||
      getAttr(entry, 'pubdate') ||
      getAttr(entry, 'pubDate')
  }

  niceDateForEntry (entry) {
    const date = new Date(this.dateForEntry(entry))

    if (date.toDateString() === new Date().toDateString()) {
      return date.toLocaleTimeString('en-us', { hour: '2-digit', minute: '2-digit' })
    }

    return date.toLocaleDateString('en-us', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  contentForEntry (entry) {
    const content = getAttr(entry, 'content:encoded') ||
      getAttr(entry, 'content') ||
      getAttr(entry, 'description')

    return sanitizeContent(content)
  }

  imageForFeed (feed) {
    return getAttr(feed, 'image.url') ||
      getAttr(feed, 'webfeeds:icon')
  }

  feedChanged (a, b) {
    b = Object.assign({}, b)
    b.id = a.id
    delete b.entry
    delete b.item

    return JSON.stringify(a.data) !== JSON.stringify(b)
  }

  entryChanged (a, b) {
    b = Object.assign({}, b)
    b.id = a.id

    return JSON.stringify(a.data) !== JSON.stringify(b)
  }
}

export default Queries
