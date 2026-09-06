import VERSION from '../state/version.js'
import { encrypt, decrypt } from '../queries/crypt.js'
import { encodeHandoff } from '../queries/handoff.js'
import UnkeyableEntryError from '../queries/unkeyable-entry-error.js'
import fingerprint from './fingerprint.js'
import { sessionsIn, started, closed, resumed, nowPlaying } from '../queries/sessions.js'
import { CHANGELOG_URL, CHANGELOG_FEED, CHANGELOG_ENTRY, DEFAULT_ADDONS, DEFAULT_SIGNALS, SAVED_SIGNAL } from './seed.js'

// An empty bucket is not a failure to read; anything else is. The difference
// matters because writing over a copy we could not read loses whatever the
// other device put there.
const NOTHING_THERE = /nosuchkey|notfound|no data returned|404/i

const MAX_OLD_ITEMS_PER_FEED = 15
const NOT_MODIFIED = 304
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

  // Diagnostics only, and this device's alone: they go in the config beside
  // syncStatus and remoteEtag, never through track(), so they never reach the
  // log and never reach another device. Nothing here may break the app, so a
  // storage failure costs the diagnostics and nothing else.
  _rememberRun (identity, change) {
    try {
      const config = this.state.getConfig(identity.id)

      return Promise.resolve(this.state.updateConfig(identity.id, {
        sessions: change(sessionsIn(config), config)
      })).catch(() => {})
    } catch (e) {
      return Promise.resolve()
    }
  }

  noteRunStarted (identity, route) {
    return this._rememberRun(identity, (list, config) => started(list, {
      at: Date.now(),
      route,
      // Read before anything can start a new one, so it describes the run that
      // just died rather than this one.
      wasSyncing: config.syncStatus === 'syncing'
    }))
  }

  noteRunEnded (identity) {
    return this._rememberRun(identity, (list) => closed(list, Date.now()))
  }

  noteRunResumed (identity) {
    return this._rememberRun(identity, (list) => resumed(list))
  }

  // Written once when playback starts and once when it stops. Deliberately not
  // on a timer: how far in is worked out from when the next run starts, which
  // a jettison follows within a second or two, so keeping it accurate costs no
  // writes at all while a video is decoding.
  notePlaying (identity, what) {
    return this._rememberRun(identity, (list) => nowPlaying(list, what && {
      kind: what.kind,
      title: `${what.title || ''}`.slice(0, 120),
      at: Date.now()
    }))
  }

  forgetRestarts (identity) {
    return this._rememberRun(identity, () => [])
  }

  track (identity, collectionName, objectId, action, data, time) {
    const event = this.state.track(identity.id, collectionName, objectId, action, data, time, time ? VERSION : undefined)

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
      // Read, merge, then write the union. Writing the local log straight over
      // the remote made two devices clobber each other: the log is only read
      // at boot, so whichever one tracked an event last won, and the other's
      // events were gone until it happened to restart.
      .then((key) => this.mergeRemoteInto(identity, remote, key)
        .then(({ unchanged }) => this.saveUnlessTheBucketHasIt(identity, remote, key, unchanged)))
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

  // Answers whether the bucket still holds the copy this device last folded
  // in, which is the half of "is there anything to write" that the log itself
  // cannot say.
  mergeRemoteInto (identity, remote, key) {
    return Promise.resolve(remote.get(identity, decrypt(key), this.remoteVersionForIdentity(identity)))
      .then((response) => {
        return Promise.resolve(this.importRemoteResponse(identity, response))
          .then(() => ({ unchanged: !!response && response.status === NOT_MODIFIED }))
      })
      .catch((e) => {
        // An empty bucket is not a copy we are up to date with: there is
        // nothing there and the whole log has to go up.
        if (NOTHING_THERE.test((e && e.message) || '')) return { unchanged: false }

        throw new Error(`Could not read the copy already there: ${(e && e.message) || 'unknown'}`)
      })
  }

  // Putting the log back when the bucket already holds exactly these bytes is
  // a megabyte of upload to arrive where it already is, and it ran 1.5
  // seconds after every tracked event. Both halves have to hold: the object
  // is still the one we wrote, and our log has not moved since we wrote it.
  saveUnlessTheBucketHasIt (identity, remote, key, unchanged) {
    const file = this.queries.eventsToFile(identity)
    const stamp = fingerprint(file)

    if (unchanged && stamp === this.state.getConfig(identity.id).remoteFingerprint) {
      return Promise.resolve()
    }

    return Promise.resolve(remote.save(file, encrypt(key)))
      .then((written) => {
        // The copy we just wrote is one we obviously already hold, so the
        // next read asks for anything but it instead of fetching it back.
        this.rememberRemoteVersion(identity, written && written.etag)

        return this.state.updateConfig(identity.id, { remoteFingerprint: stamp })
      })
  }

  restoreIdentityFromRemote (identity) {
    const adapter = this.queries.addonAdapterForActionForIdentity(identity, 'get')

    return this.keyForIdentity(identity)
      .then((key) => adapter.get(identity, decrypt(key), this.remoteVersionForIdentity(identity)))
      .then((response) => this.importRemoteResponse(identity, response))
      .catch((e) => console.warn('Could not restore identity from remote', e))
  }

  // Which copy of the log this browser last folded in. Device-local, like the
  // sync status beside it and never in the log itself: it describes one
  // bucket read by one device, and another device inheriting it would skip a
  // read it has never done.
  remoteVersionForIdentity (identity) {
    return { etag: this.state.getConfig(identity.id).remoteEtag }
  }

  // A conditional read that matched carries no body, and it is not an empty
  // bucket: the copy is there and it is the one already folded in. Importing
  // the empty string it comes with would be a merge of nothing, and treating
  // it as a failed read would abort the save that follows.
  importRemoteResponse (identity, response) {
    if (!response || response.status === NOT_MODIFIED) {
      return
    }

    return Promise.resolve(this.state.importRaw(identity.id, response.body))
      .then(() => this.rememberRemoteVersion(identity, response.etag))
  }

  // Only ever recorded for a copy that is now folded in, so the read it
  // skips next time is a read of something this device already has.
  rememberRemoteVersion (identity, etag) {
    if (!etag) {
      return
    }

    return this.state.updateConfig(identity.id, { remoteEtag: etag })
  }

  // An identity with no keychain entry syncs unencrypted, which is what
  // every identity created before the keychain existed expects.
  keyForIdentity (identity) {
    return this.keychain.getKey(identity.id).catch(() => '')
  }

  restoreFromLocal () {
    return this.state.restore()
      .then(() => {
        this.queries.allIdentities().forEach((identity) => {
          this.releaseUnrefusedFailuresForIdentity(identity)
        })
      })
  }

  // A stored failure with no HTTP status behind it never carried a refusal
  // from a server: it is either an error of ours, back when one of those was
  // recorded against the feed, or a host that could not be reached at all.
  // Neither is worth a day of silence without one more attempt, and neither
  // is the case backoff exists to protect — that one is a server refusing us,
  // and it keeps every minute it earned.
  //
  // Once per device. The count is left alone deliberately, so a feed that is
  // genuinely unreachable fails again and returns to the backoff it had
  // rather than starting its climb over each time this runs.
  releaseUnrefusedFailuresForIdentity (identity) {
    if (this.state.getConfig(identity.id).releasedUnrefusedFailures) {
      return
    }

    this.state.updateConfig(identity.id, { releasedUnrefusedFailures: true })

    this.queries.feedsWithUnrefusedFailureForIdentity(identity).forEach((feed) => {
      this.track(identity, 'feeds', feed.id, 'clearFailure')
    })
  }

  restoreFromRemote () {
    return Promise.all(
      this.queries.allIdentities().map((identity) => this.restoreIdentityFromRemote(identity))
    )
  }

  fetchUrl (identity, action, url, options = {}) {
    const adapter = this.queries.addonAdapterForActionForIdentity(identity, action)

    return adapter[action](url, options)
      .then((response) => {
        return Object.assign({}, response, { data: this.queries.jsonFromXml(response.body) })
      })
  }

  fetchFeed (identity, feed) {
    const url = this.queries.urlForFeed(feed)

    return this.fetchUrl(identity, 'rss', url, this.queries.validatorsForFeed(feed))
      // Only the request itself counts as the feed refusing us. An error
      // thrown further down is ours, and recording it here would put the feed
      // into a backoff that doubles to a day, so our own bug would read as
      // the feed having gone quiet.
      .catch((e) => {
        this.trackFetchFailedForIdentity(identity, feed, e)
        throw e
      })
      .then((response) => {
        // The feed told us it has not changed, so there is no body to read and
        // nothing to compare. Keep the validators we asked with.
        if (response.status === NOT_MODIFIED) {
          return this.trackFetchedForIdentity(identity, feed, this.queries.validatorsForFeed(feed))
        }

        const data = response.data
        const entries = data.entry || data.item || []

        delete data.entry
        delete data.item

        this.upsertFeedForIdentity(identity, feed, data, response)

        let skipped = 0

        entries.forEach((e) => {
          // One item we cannot identify is not a reason to lose the rest of
          // the feed. Letting this escape the loop meant a single item with
          // no guid and no link hid every item after it, on every poll, while
          // the feed went on reading as successfully fetched.
          try {
            this.upsertEntryForIdentity(identity, feed, e, this.queries.lastReadDateForFeed(identity, feed))
          } catch (error) {
            // Only the item's own fault. Anything else thrown here is a bug
            // of ours, and swallowing those is how a feed goes quiet with
            // nothing to say why.
            if (!(error instanceof UnkeyableEntryError)) {
              throw error
            }

            skipped++

            console.warn(`Could not store an entry from ${this.queries.urlForFeed(feed)}`, error)
          }
        })

        this.trackSkippedEntriesForIdentity(identity, feed, skipped)
      })
  }

  trackFetchedForIdentity (identity, feed, { etag, lastModified } = {}) {
    this.track(identity, 'feeds', feed.id, 'fetched', { etag, lastModified })
  }

  // Only on a change, so a healthy feed writes nothing and a feed that has
  // stopped sending the bad item says so once. A 304 leaves the count alone,
  // because the body it describes is the body we still have.
  trackSkippedEntriesForIdentity (identity, feed, count) {
    if (!count && !this.queries.skippedEntriesForFeed(feed)) {
      return
    }

    this.track(identity, 'feeds', feed.id, 'skippedEntries', { count })
  }

  trackFetchFailedForIdentity (identity, feed, error) {
    this.track(identity, 'feeds', feed.id, 'fetchFailed', {
      count: this.queries.failureCountForFeed(feed) + 1,
      status: error && error.status
    })
  }

  upsertFeedForIdentity (identity, feed, data, response = {}) {
    // Recorded on every poll, changed or not: it carries the validators that
    // make the next poll conditional, and clears any failure backoff.
    this.trackFetchedForIdentity(identity, feed, response)

    if (!this.queries.feedChanged(feed, data)) {
      return
    }

    this.track(identity, 'feeds', feed.id, 'update', { data })
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
    const feeds = this.queries.findOutdatedFeedsForIdentity(identity)

    return this._fetchFeedsInSeries(identity, feeds)
  }

  fetchFeedsForIdentity (identity) {
    const feeds = this.queries.feedsToFetchForIdentity(identity)

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
          // .finally alone re-throws, so every failed fetch became an
          // unhandled rejection and the poll cycle stopped at the first
          // unreachable feed.
          this.fetchFeed(identity, feed)
            .catch((e) => console.warn(`Could not fetch ${this.queries.urlForFeed(feed)}`, e))
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

  keepScreenAwake () {
    return this.wakeLock.hold()
  }

  letScreenSleep () {
    return this.wakeLock.release()
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

  // What it takes to be you somewhere else: the identity, its feeds, signals
  // and add-ons, and the entries you set aside. Not the entry corpus — that
  // refetches itself from the feeds, and copying thousands of them makes the
  // clipboard useless for the thing it is for.
  portableIdentity (identity) {
    const saved = this.queries.entriesForIdentity(identity)
      .filter((entry) => this.queries.isEntrySaved(entry))
      .map((entry) => entry.id)

    return this.queries.findAllEvents(identity)
      .filter((event) => event.collection !== 'entries' || saved.indexOf(event.objectId) !== -1)
      .map((event) => `${event.key} ${this.portableEvent(event) || ''}`.trim())
      .join('\n')
  }

  // A roll up folds every entry into one event, where the filter above cannot
  // see them one at a time.
  portableEvent (event) {
    if (event.action !== 'rollup') return event.toLocal()

    const entries = (event.data.entries || [])
      .filter((entry) => this.queries.isEntrySaved(entry))

    return JSON.stringify(Object.assign({}, event.data, { entries }))
  }

  copyIdentityToClipboard (identity) {
    return this.copyToClipboard(this.portableIdentity(identity))
  }

  // Everything else about the identity is already in the bucket, so the only
  // thing that has to cross the room is how to open it. Small enough to be a
  // picture, which is why this is not the clipboard copy.
  handoffForIdentity (identity) {
    const remote = this.queries.remoteAdapterForIdentity(identity)

    if (!remote) return Promise.resolve('')

    return this.keyForIdentity(identity)
      .then((key) => encodeHandoff({ t: remote.type, d: remote.portableData(), k: key || '' }))
  }

  // The other half: read the bucket the code points at and import what is in
  // it. The identity's own add-ons ride in that log, so this device ends up
  // configured to keep backing up without being told twice.
  setUpFromHandoff (payload) {
    if (!payload || !payload.t) {
      return Promise.reject(new Error('That code is not a Follow Along setup.'))
    }

    const adapter = this.queries.adapterForAddonForIdentity(null, { type: payload.t, data: payload.d })

    return Promise.resolve(adapter.get({}, decrypt(payload.k), {}))
      .then((response) => {
        return this.importIdentity(response && response.body)
          // This device has just folded in that exact copy, so its first sync
          // has nothing to fetch back.
          .then((identity) => Promise.resolve(this.rememberRemoteVersion(identity, response && response.etag)).then(() => identity))
      })
      .then((identity) => this.keychain.addKnown(identity.id, payload.k).then(() => identity))
  }

  importIdentity (raw) {
    const data = `${raw || ''}`.trim()
    // Either event introduces the identity. A roll up replaces the whole log
    // with one rollup event, so a rolled-up copy has no create left to find
    // and looking only for that one rejected a perfectly good backup.
    const found = data.match(/\/identities\/([^/\s]+)\/(?:create|rollup)/)

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
