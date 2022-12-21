class Commands {
  constructor (options) {
    for (const key in options) {
      this[key] = options[key]
    }
  }

  addIdentity (identity) {
    identity.name = identity.name || 'My Account'
    identity.id = this.state.createDB(null, {})

    this.track(identity, 'identities', identity.id, 'create', identity)

    this.addFeedToIdentity(identity, {
      id: 'followalong',
      title: 'Follow Along',
      description: 'Stay in-the-know on Follow Along.',
      image: {
        url: 'https://www.followalong.net/img/favicon.ico'
      }
    })
    const feed = this.queries.latestFeedForIdentity(identity)
    this.addEntryToIdentity(identity, {
      feedId: feed.id,
      guid: 'intro',
      title: 'Twitter is done. Long live RSS.',
      author: {
        name: 'Follow Along',
        uri: 'https://www.followalong.com'
      },
      published: new Date().toISOString(),
      'content:encoded': 'Welcome to new.'
    })
  }

  addFeedToIdentity (identity, feed) {
    this.track(identity, 'feeds', null, 'create', feed)
  }

  addEntryToIdentity (identity, entry) {
    if (!entry.feedId) {
      throw new Error('Entry has no `feedId`')
    }

    this.track(identity, 'entries', null, 'create', entry)
  }

  track (identity, collectionName, objectId, action, data) {
    this.state.track(identity.id, collectionName, objectId, action, data)
  }

  restoreFromLocal () {
    return this.state.restore()
  }
}

export default Commands
