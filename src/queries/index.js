const getAttr = (obj, attr) => {
  obj = obj || {}
  obj = obj.data || {}

  const splat = attr.split('.')
  const last = splat.pop()

  for (var i = 0; i < splat.length; i++) {
    if (typeof obj[splat[i]] === 'object') {
      obj = obj[splat[i]]
    } else {
      return ''
    }
  }

  if (typeof obj !== 'object') {
    return ''
  }

  if (typeof obj[last] === 'object') {
    return obj[last]._
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

  keyForEntry (entry) {
    if (typeof entry.id === 'string') {
      return entry.id
    }

    if (typeof entry.id === 'object' && typeof entry.id._ === 'string') {
      return entry.id._
    }

    if (typeof entry.guid === 'string') {
      return entry.guid
    }

    if (typeof entry.guid === 'object' && typeof entry.guid._ === 'string') {
      return entry.guid._
    }

    if (typeof entry.link === 'string') {
      return entry.link
    }

    if (typeof entry.link === 'object' && typeof entry.link._ === 'string') {
      return entry.link._
    }

    if (typeof entry.link === 'object' && typeof entry.link.href === 'string') {
      return entry.link.href
    }

    throw new Error(`Cannot find a key for ${entry}`)
  }

  entryForFeedForIdentity (identity, feed, key) {
    return this.entriesForFeed(identity, feed)
      .find((e) => this.urlForEntry(e) === key)
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
    return getAttr(feed, 'link.href') ||
      getAttr(feed, 'link') ||
      getAttr(feed, 'url')
  }

  urlForEntry (entry) {
    return getAttr(entry, 'link.href') ||
      getAttr(entry, 'link') ||
      getAttr(entry, 'url')
  }

  titleForFeed (feed) {
    return getAttr(feed, 'title')
  }

  dateForEntry (entry) {
    return getAttr(entry, 'published')
  }

  niceDateForEntry (entry) {
    const date = new Date(this.dateForEntry(entry))

    if (date.toDateString() === new Date().toDateString()) {
      return date.toLocaleTimeString('en-us', { hour: '2-digit', minute: '2-digit' })
    }

    return date.toLocaleDateString('en-us', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  contentForEntry (entry) {
    return getAttr(entry, 'content:encoded') ||
      getAttr(entry, 'content') ||
      getAttr(entry, 'description')
  }

  imageForFeed (feed) {
    return getAttr(feed, 'image.url')
  }

  feedChanged (a, b) {
    b = Object.assign({}, b)
    b.id = a.id
    delete b.entry

    return JSON.stringify(a.data) !== JSON.stringify(b)
  }

  entryChanged (a, b) {
    b = Object.assign({}, b)
    b.id = a.id

    return JSON.stringify(a.data) !== JSON.stringify(b)
  }
}

export default Queries
