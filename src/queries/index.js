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

  feedForIdentity (identity, feedId) {
    return this.state.findAll(identity.id, 'feeds')
      .find((f) => f.id === feedId)
  }

  latestFeedForIdentity (identity) {
    const feeds = this.state.findAll(identity.id, 'feeds')

    return feeds[feeds.length - 1]
  }

  titleForEntry (entry) {
    return entry.title
  }

  urlForFeed (feed) {
    return feed.url
  }

  urlForEntry (entry) {
    return entry.url
  }

  titleForFeed (feed) {
    return feed.title
  }

  dateForEntry (entry) {
    return entry.published
  }

  niceDateForEntry (entry) {
    const date = new Date(this.dateForEntry(entry))

    if (date.toDateString() === new Date().toDateString()) {
      return date.toLocaleTimeString('en-us', { hour: '2-digit', minute: '2-digit' })
    }

    return date.toLocaleDateString('en-us', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  contentForEntry (entry) {
    return entry['content:encoded'] || entry.description
  }

  imageForFeed (feed) {
    return feed.image.url
  }
}

export default Queries
