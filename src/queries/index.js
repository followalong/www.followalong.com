import { XMLParser } from 'fast-xml-parser'
import SORT_BY_NAME from './sorters/sort-by-name.js'
import SORT_BY_TIME from './sorters/sort-by-time.js'
import SORT_BY_NEED_TO_UPDATE from './sorters/sort-by-need-to-update.js'
import sanitizeContent from './presenters/sanitize-content.js'

const parser = new XMLParser({
  isArray: (name, jpath, isLeafNode, isAttribute) => {
    return ['entry', 'item'].indexOf(name) !== -1
  }
})

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

  entriesForIdentity (identity, limit = null) {
    const entries = this.state.findAll(identity.id, 'entries')
      .sort(SORT_BY_TIME(this))

    if (limit) {
      return entries.slice(0, limit)
    }

    return entries
  }

  entriesForFeed (identity, feed) {
    return this.state.findAll(identity.id, 'entries')
      .filter((e) => e.feedId === feed.id)
      .sort(SORT_BY_TIME(this))
  }

  lastEntryForFeed (identity, feed) {
    return this.entriesForFeed(identity, feed)[0]
  }

  jsonFromXml (xml) {
    let obj = parser.parse(xml)

    if (typeof obj.rss === 'object') {
      obj = obj.rss
    }

    if (typeof obj.feed === 'object') {
      obj = obj.feed
    }

    if (typeof obj.channel === 'object') {
      obj = obj.channel
    }

    if (typeof obj.feed === 'object') {
      obj = obj.feed
    }

    return obj
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

  feedsForIdentity (identity) {
    return this.state.findAll(identity.id, 'feeds')
      .sort(SORT_BY_NAME(this))
  }

  lastUpdatedForFeed (feed) {
    return feed.updatedAt
  }

  findOutdatedFeedsForIdentity (identity) {
    const OUTDATED_MINUTES = 15
    const outdatedDate = Date.now() - (OUTDATED_MINUTES * (60 * 1000))

    return this.feedsForIdentity(identity)
      .filter((feed) => this.lastUpdatedForFeed(feed) < outdatedDate)
      .sort(SORT_BY_NEED_TO_UPDATE(this))
  }

  feedForIdentity (identity, feedId) {
    return this.feedsForIdentity(identity)
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
    const date = getAttr(entry, 'published') ||
      getAttr(entry, 'pubdate') ||
      getAttr(entry, 'pubDate')

    return new Date(date)
  }

  niceDateForEntry (entry) {
    const date = this.dateForEntry(entry)

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

  isEntryRead (entry) {
    return entry.readAt
  }
}

export default Queries
