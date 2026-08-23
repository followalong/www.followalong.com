import { encrypt, decrypt } from '../queries/crypt.js'
import { CHANGELOG_URL, CHANGELOG_FEED, CHANGELOG_ENTRY, DEFAULT_ADDONS, DEFAULT_SIGNALS, SAVED_SIGNAL } from './seed.js'

const MAX_OLD_ITEMS_PER_FEED = 15
const SYNC_DEBOUNCE = 1500

class Commands {
  constructor (options) {
    for (const key in options) {
      this[key] = options[key]
    }
  }

  addIdentity (identity) {
    identity.name = identity.name || 'My Account'
    identity.id = this.state.createDB(null, {})

    this.keychain.addNone(identity.id)

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
    const event = this.state.track(identity.id, collectionName, objectId, action, data)

    this.debouncedSyncIdentity(identity)

    return event
  }

  debouncedSyncIdentity (identity) {
    this._syncTimeouts = this._syncTimeouts || {}

    clearTimeout(this._syncTimeouts[identity.id])

    this._syncTimeouts[identity.id] = setTimeout(() => {
      this.syncIdentity(identity)
    }, SYNC_DEBOUNCE)
  }

  syncIdentity (identity) {
    const remote = this.queries.remoteAdapterForIdentity(identity)

    // Nothing to sync to is a state worth reporting, not a silent success.
    if (!remote) {
      this.state.updateConfig(identity.id, { syncStatus: 'off', syncError: '' })

      return Promise.resolve(this.queries.syncStatusForIdentity(identity))
    }

    this.state.updateConfig(identity.id, { syncStatus: 'syncing', syncError: '' })

    return this.keyForIdentity(identity)
      .then((key) => remote.save(this.queries.eventsToFile(identity), encrypt(key)))
      .then(() => {
        this.state.updateConfig(identity.id, {
          syncStatus: 'saved',
          syncedAt: Date.now(),
          syncError: ''
        })
      })
      .catch((e) => {
        // Recorded rather than rethrown: this runs on a debounce from every
        // tracked event, and a rejection there has nobody to catch it.
        this.state.updateConfig(identity.id, {
          syncStatus: 'failed',
          syncError: (e && e.message) || 'Could not save'
        })
      })
      .then(() => this.queries.syncStatusForIdentity(identity))
  }

  restoreIdentityFromRemote (identity) {
    const adapter = this.queries.addonAdapterForActionForIdentity(identity, 'get')

    return this.keyForIdentity(identity)
      .then((key) => adapter.get(identity, decrypt(key)))
      .then((data) => this.state.importRaw(identity.id, data))
      .catch((e) => console.warn('Could not restore identity from remote', e))
  }

  // An identity with no keychain entry syncs unencrypted, which is what
  // every identity created before the keychain existed expects.
  keyForIdentity (identity) {
    return this.keychain.getKey(identity.id).catch(() => '')
  }

  restoreFromLocal () {
    return this.state.restore()
  }

  restoreFromRemote () {
    return Promise.all(
      this.queries.allIdentities().map((identity) => this.restoreIdentityFromRemote(identity))
    )
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
    return this.keychain.remove(identity.id)
      .then(() => this.state.deleteDB(identity.id))
      .then(() => {
        if (!this.queries.allIdentities().length) {
          this.addIdentity({})
        }
      })
  }

  markEntryAsReadForIdentity (identity, entry) {
    this.track(identity, 'entries', entry.id, 'markRead')
  }

  markEntryAsUnreadForIdentity (identity, entry) {
    this.track(identity, 'entries', entry.id, 'markUnread')
  }

  saveEntryForIdentity (identity, entry) {
    this.ensureSavedSignalForIdentity(identity)
    this.track(identity, 'entries', entry.id, 'save')
  }

  unsaveEntryForIdentity (identity, entry) {
    this.track(identity, 'entries', entry.id, 'unsave')
  }

  // Identities created before saving existed have no Saved signal, so give
  // them one the first time they save something rather than migrating on boot.
  ensureSavedSignalForIdentity (identity) {
    if (this.queries.signalForIdentity(identity, SAVED_SIGNAL.permalink)) return

    this.addSignalToIdentity(identity, SAVED_SIGNAL)
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

  // The keychain has always known all three strategies; nothing until now
  // let anyone pick between them.
  changeEncryptionForIdentity (identity, strategy) {
    // Not remove-then-add: every add path overwrites both store and memory,
    // and removing first meant a cancelled password prompt left the identity
    // with no keychain entry at all.
    return this.keychain.add(strategy, identity.id)
      .then(() => this.syncIdentity(identity))
  }

  hideHintForIdentity (identity, hint) {
    this.track(identity, 'identities', identity.id, 'hideHint', { hint })
  }

  renameIdentity (identity, name) {
    this.track(identity, 'identities', identity.id, 'update', { name })
  }

  resetIdentity (identity) {
    return this.state.reset(identity.id)
  }

  // The event log is the identity: replaying it anywhere rebuilds the whole
  // thing, so a backup is just the log and nothing else.
  exportIdentity (identity) {
    return this.queries.eventsToFile(identity)
  }

  downloadIdentity (identity) {
    return this.saveAs(this.exportIdentity(identity), `follow-along.${identity.id}.log`)
  }

  copyIdentityToClipboard (identity) {
    return this.copyToClipboard(this.exportIdentity(identity))
  }

  importIdentity (raw) {
    const data = `${raw || ''}`.trim()
    const found = data.match(/\/identities\/([^/\s]+)\/create/)

    if (!found) {
      return Promise.reject(new Error('That does not look like a Follow Along backup.'))
    }

    const id = found[1]

    if (this.queries.allIdentities().some((identity) => identity.id === id)) {
      return Promise.reject(new Error('That identity is already on this device.'))
    }

    // Keep the original id: the log's own keys are written against it.
    this.state.createDB(id, {})
    this.keychain.addNone(id)

    return this.state.importRaw(id, data)
      .then(() => this.queries.allIdentities().find((identity) => identity.id === id))
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
