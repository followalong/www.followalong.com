const getAttr = (obj, attr) => {
  if (typeof obj[attr] === 'object') {
    return obj[attr]._
  }

  return obj[attr]
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

  feedForIdentity (identity, feedUrl) {
    return this.state.findAll(identity.id, 'feeds')
      .find((f) => f.url === feedUrl)
  }

  latestFeedForIdentity (identity) {
    const feeds = this.state.findAll(identity.id, 'feeds')

    return feeds[feeds.length - 1]
  }

  titleForEntry (entry) {
    return getAttr(entry, 'title')
  }

  urlForFeed (feed) {
    return getAttr(feed, 'url')
  }

  urlForEntry (entry) {
    return getAttr(entry, 'url')
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
    return getAttr(entry, 'content:encoded') || getAttr(entry, 'content') || getAttr(entry, 'description')
  }

  imageForFeed (feed) {
    return feed.image.url
  }
}

export default Queries
