import { CHANGELOG_URL, CHANGELOG_FEED, CHANGELOG_ENTRY, DEFAULT_ADDONS, DEFAULT_SIGNALS } from './seed.js'

const MAX_OLD_ITEMS_PER_FEED = 15

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

    this.addFeedToIdentity(identity, CHANGELOG_URL, CHANGELOG_FEED, [CHANGELOG_ENTRY()])

    DEFAULT_ADDONS.forEach((addon) => this.saveAddonForIdentity(identity, addon))
    DEFAULT_SIGNALS.forEach((signal) => this.addSignalToIdentity(identity, signal))
  }

  addFeedToIdentity (identity, url, data, entries = []) {
    const event = this.track(identity, 'feeds', null, 'create', { url, data })

    const feed = this.queries.feedForIdentity(identity, event.objectId)
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
    return this.state.track(identity.id, collectionName, objectId, action, data)
  }

  restoreFromLocal () {
    return this.state.restore()
  }

  fetchUrl (identity, action, url) {
    const adapter = this.queries.addonAdapterForActionForIdentity(identity, action)

    return adapter[action](url)
      .then(this.queries.jsonFromXml)
  }

  fetchFeed (identity, feed) {
    const url = this.queries.urlForFeed(feed)

    return this.fetchUrl(identity, 'rss', url)
      .then((data) => {
        const entries = data.entry || data.item || []

        delete data.entry
        delete data.item

        this.upsertFeedForIdentity(identity, feed, data)

        entries.forEach((e) => this.upsertEntryForIdentity(identity, feed, e, this.queries.lastReadDateForFeed(identity, feed)))
      })
  }

  upsertFeedForIdentity (identity, feed, data) {
    this.track(identity, 'feeds', feed.id, 'update', this.queries.feedChanged(feed, data) ? { data } : {})
  }

  upsertEntryForIdentity (identity, feed, data, lastReadDateForFeed = 0) {
    const key = this.queries.keyForEntry({ data })
    const found = this.queries.entryForFeedForIdentity(identity, feed, key)

    if (!found) {
      const event = this.track(identity, 'entries', null, 'create', { feedId: feed.id, data })
      const entry = this.queries.entryForIdentity(identity, event.objectId)

      if (lastReadDateForFeed > this.queries.dateForEntry({ data }).getTime()) {
        this.markEntryAsReadForIdentity(identity, entry)
      }

      return
    }

    if (this.queries.entryChanged(found, data)) {
      this.track(identity, 'entries', found.id, 'update', { data })
    }
  }

  fetchOutdatedFeeds (identity) {
    // TODO: We can use the outdated feeds once we have a "last fetched at" mechanism
    // const feeds = this.queries.findOutdatedFeedsForIdentity(identity)
    const feeds = this.queries.unpausedFeedsForIdentity(identity)

    return this._fetchFeedsInSeries(identity, feeds)
  }

  fetchFeedsForIdentity (identity) {
    const feeds = this.queries.unpausedFeedsForIdentity(identity)

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
    return this.state.deleteDB(identity.id)
      .then(() => {
        if (!this.queries.allIdentities().length) {
          this.addIdentity({})
        }
      })
  }

  markEntryAsReadForIdentity (identity, entry) {
    this.track(identity, 'entries', entry.id, 'read')
  }

  markEntryAsUnreadForIdentity (identity, entry) {
    this.track(identity, 'entries', entry.id, 'unread')
  }

  showNewEntries (identity) {
    this.state.updateConfig(identity.id, { lastBackgroundFetch: Date.now() })
    this.scrollToTop()
  }

  scrollToTop () {
    this.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    })
  }

  addSignalToIdentity (identity, data) {
    this.track(identity, 'signals', null, 'create', { data })
  }

  pauseFeedForIdentity (identity, feed) {
    this.track(identity, 'feeds', feed.id, 'pause')
  }

  unpauseFeedForIdentity (identity, feed) {
    this.track(identity, 'feeds', feed.id, 'unpause')
  }

  saveAddonForIdentity (identity, addon) {
    this.track(identity, 'addons', addon.id, 'configure', { type: addon.type, data: addon.data || {} })
  }

  removeAddonFromIdentity (identity, addon) {
    this.track(identity, 'addons', addon.id, 'delete')
  }

  disableSleep ($audio) {
    if (this.noSleep) {
      $audio.currentTime = 0
      $audio.play()
      this.noSleep.enable()
    }
  }

  enableSleep ($audio) {
    if (this.noSleep) {
      this.noSleep.disable()
    }
  }

  resetIdentity (identity) {
    return this.state.reset(identity.id)
  }

  createProjectionForIdentity (identity) {
    return new Promise((resolve, reject) => {
      const data = {
        identity,
        feeds: this.queries.feedsForIdentity(identity),
        entries: this.queries.entriesForIdentity(identity, MAX_OLD_ITEMS_PER_FEED),
        signals: this.queries.signalsForIdentityForProjection(identity),
        addons: this.queries.addonsForIdentity(identity)
      }

      this.resetIdentity(identity)
        .then(() => this.track(identity, 'identities', identity.id, 'rollup', data))
        .then(resolve)
        .catch(reject)
    })
  }
}

export default Commands
