const CHANGELOG_URL = 'https://changelog.followalong.com/feed.xml'

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

    this.addFeedToIdentity(identity, CHANGELOG_URL, {
      title: 'Changelog',
      description: 'Stay in-the-know on Follow Along.',
      image: {
        url: 'https://www.followalong.net/img/favicon.ico'
      }
    })
  }

  addFeedToIdentity (identity, url, data, entries = []) {
    this.track(identity, 'feeds', null, 'create', { url, data })

    if (url === CHANGELOG_URL) {
      entries.unshift({
        id: 'about',
        title: 'Twitter is done. Long live RSS.',
        published: new Date().toISOString(),
        content: `
        <p>
          It's not <em>just</em> Twitter. It's all the rest of the them as well!
        </p>

        <p>
          If you're not tech-savvy, Follow Along is a place where you can follow the people and communities that you care about.
          The underlying technology of Follow Along (RSS feeds) has been around for <em>decades</em>, so a large chunk of the internet is already here – calendars, blogs, bizapps, and some traditional social media too!
        </p>

        <p>
          If you're interested in the tech specs, Follow Along is a 100%-client-side PWA that fetches RSS feeds for you.
          We don't track <em>anything</em> about you or the feeds you follow.
          Have a look at our <a href="https://github.com/followalong/www.followalong.com">open source code</a> (and host it yourself!)
        </p>

        <p>
          Finally, we have big plans that are laid out in <a href="https://changelog.followalong.com/2022/12/23/the-path-to-v3">The Path to V3 in 2023</a>.
          We'd ❤️ to have you follow along for the ride!
        </p>

        <p>
          Cheers!
        </p>
        `.trim()
      })
    }

    const feed = this.queries.latestFeedForIdentity(identity)
    entries.forEach((entry) => {
      this.upsertEntryForIdentity(identity, feed, entry)
    })
  }

  removeFeedFromIdentity (identity, feed) {
    this.track(identity, 'feeds', feed.id, 'delete')

    this.queries.entriesForFeed(identity, feed).forEach((entry) => {
      this.track(identity, 'entries', entry.id, 'delete')
    })
  }

  track (identity, collectionName, objectId, action, data) {
    this.state.track(identity.id, collectionName, objectId, action, data)
  }

  restoreFromLocal () {
    return this.state.restore()
  }

  fetchUrl (url) {
    return this.fetch(url)
      .then(this.queries.jsonFromXml)
  }

  fetchFeed (identity, feed) {
    return this.fetchUrl(this.queries.urlForFeed(feed))
      .then((data) => {
        this.upsertFeedForIdentity(identity, feed, data)

        const entries = data.entry || data.item || []

        entries.forEach((e) => this.upsertEntryForIdentity(identity, feed, e))
      })
  }

  upsertFeedForIdentity (identity, feed, data) {
    if (this.queries.feedChanged(feed, data)) {
      this.track(identity, 'feeds', feed.id, 'update', { data })
    }
  }

  upsertEntryForIdentity (identity, feed, data) {
    const key = this.queries.keyForEntry({ data })
    const found = this.queries.entryForFeedForIdentity(identity, feed, key)

    if (!found) {
      this.track(identity, 'entries', null, 'create', { feedId: feed.id, data })
      return
    }

    if (this.queries.entryChanged(found, data)) {
      this.track(identity, 'entries', found.id, 'update', { data })
    }
  }

  fetchOutdatedFeeds (identity) {
    // TODO: We can use the outdated feeds once we have a "last fetched at" mechanism
    // const feeds = this.queries.findOutdatedFeedsForIdentity(identity)
    const feeds = this.queries.feedsForIdentity(identity)

    return this._fetchFeedsInSeries(identity, feeds)
  }

  fetchFeedsForIdentity (identity) {
    const feeds = this.queries.feedsForIdentity(identity)

    return this._fetchFeedsInSeries(identity, feeds)
  }

  _fetchFeedsInSeries (identity, feeds) {
    let promise = Promise.resolve()

    if (!feeds.length) {
      return promise
    }

    feeds.forEach((feed) => {
      promise = promise.then(() => {
        return new Promise((resolve) => {
          this.fetchFeed(identity, feed)
            .finally(() => setTimeout(resolve, 0))
        })
      })
    })

    return promise
  }

  forgetIdentity (identity) {
    return new Promise((resolve, reject) => {
      this.state.deleteDB(identity.id)

      if (!this.queries.allIdentities().length) {
        this.addIdentity({})
      }

      resolve()
    })
  }

  markEntryAsReadForIdentity (identity, entry) {
    this.track(identity, 'entries', entry.id, 'read')
  }

  markEntryAsUnreadForIdentity (identity, entry) {
    this.track(identity, 'entries', entry.id, 'unread')
  }

  showNewEntries () {
    this.queries.lastBackgroundFetch = Date.now()
    this.scrollToTop()
  }

  scrollToTop () {
    this.window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    })
  }
}

export default Commands
