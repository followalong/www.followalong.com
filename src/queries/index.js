import { XMLParser } from 'fast-xml-parser'
import linkifyHtml from 'linkify-html'
import { ADAPTERS, None } from './addons.js'
import SORT_BY_ORDER from './sorters/sort-by-order.js'
import SORT_BY_TIME from './sorters/sort-by-time.js'
import SORT_BY_FEED_TITLE from './sorters/sort-by-feed-title.js'
import SORT_BY_NEED_TO_UPDATE from './sorters/sort-by-need-to-update.js'
import sanitizeContent from './presenters/sanitize-content.js'
import UnkeyableEntryError from './unkeyable-entry-error.js'
import excerpt from './presenters/excerpt.js'
import { sessionsIn, deaths } from './sessions.js'

// How long a feed is considered fresh. The poll ticks more often than this
// so a feed that just came out of backoff is picked up promptly.
// What a roll up keeps of a feed's read entries. Retention, deliberately, and
// not a side effect of compaction: a roll up is a snapshot, so whatever it
// leaves out is gone from this device for good. Fifteen is enough that
// scrolling back through a feed still finds something, and small enough that
// a corpus stops growing with every article ever published.
//
// Unread entries are never counted against it - they have not been read, so
// nobody has decided anything about them - and a saved entry is never
// discarded at all, because saving is the one place a reader says to keep
// something.
const KEEP_READ_PER_FEED = 15

const OUTDATED_MINUTES = 15
const BACKOFF_BASE_MINUTES = 15
const BACKOFF_MAX_MINUTES = 24 * 60

const VIDEO_TYPES = /\.(mp4)/
const AUDIO_TYPES = /\.(mp3|wav)/
const IMAGE_TYPES = /\.(png|jpeg|jpg|gif)/

// Elements whose whole job is to name the picture. Take what they say: plenty
// of feeds serve thumbnails from an extensionless CDN path, and asking those
// for a .jpg threw away the only image they had. getAttr falls back to the
// element's text when it carries no attribute, so both spellings work.
const NAMED_IMAGE_ATTRS = [
  'itunes:image.@_href',
  'media:group.media:thumbnail.@_url',
  'media:group.media:thumbnail.url',
  'media:thumbnail.@_url',
  'media:thumbnail.url',
  'media:content.image.@_url',
  'media:content.image.url',
  'enclosure.image.@_url',
  'enclosure.image.url'
]

// Anything else a picture might be hiding in. These carry pages, videos and
// audio just as often, so they still have to look like an image.
const MAYBE_IMAGE_ATTRS = [
  'link',
  'media:content.@_url',
  'media:content.url',
  'enclosure.@_url',
  'enclosure.url'
]

const parser = new XMLParser({
  ignoreAttributes: false,
  isArray: (name, jpath, isLeafNode, isAttribute) => {
    return ['entry', 'item'].indexOf(name) !== -1
  }
})

const hostFor = (url) => {
  try {
    return new URL(url).host
  } catch (e) {
    return url
  }
}

// A guid or a link is either the text of the element or an attribute on it,
// and Atom entries usually carry several links: alternate points at the
// entry, self and replies point elsewhere.
const textOnly = (value) => (typeof value === 'string' ? value : '')

const hrefOf = (value) => {
  if (!value) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return hrefOf(value.find((one) => (one || {})['@_rel'] === 'alternate') || value[0])
  }

  return value['@_href'] || ''
}

const stripHTML = (html) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

const objHasNewData = (existingObj, newData) => {
  // Nothing stored under this branch at all, which is not the same as nothing
  // new: every value below it is arriving for the first time and the scalar
  // comparison below says so. Recursing into the undefined instead threw, and
  // the throw happened inside a poll, so a YouTube entry that had never
  // carried a media:group killed its whole feed.
  existingObj = existingObj || {}

  for (const key in newData) {
    if (typeof newData[key] === 'object') {
      if (
        objHasNewData(existingObj[key], newData[key]) &&
        key.indexOf('media:community') === -1
      ) {
        return true
      }
    } else {
      if (getAttr(newData, key, true) !== getAttr(existingObj, key, true)) {
        return true
      }
    }
  }

  return false
}

const getAttr = (obj, attr, baseObj = false) => {
  obj = obj || {}

  if (!baseObj) {
    obj = obj.data || {}
  }

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

  // Derived reads are recomputed per render and each one walks every entry.
  // Everything here is a pure function of the folded state, so it is cached
  // against the revision of the collections it reads and thrown away when one
  // of those changes. Naming none of them means every event invalidates it,
  // which is what a poll writing a feeds.fetched event per feed used to do to
  // work that only ever looked at entries.
  _memo (identity, key, build, collections) {
    const revision = this.state.revisionFor(identity.id, collections)

    this._cache = this._cache || {}

    const slot = this._cache[identity.id] = this._cache[identity.id] || {}
    const cached = slot[key]

    if (cached && cached.revision === revision) {
      return cached.value
    }

    const value = build()

    slot[key] = { revision, value }

    return value
  }

  allIdentities () {
    return this.state.findAll(null, 'identities')
  }

  hintIsShown (identity, hint) {
    return ((identity || {}).hints || []).indexOf(hint) === -1
  }

  nameForIdentity (identity) {
    return (identity && identity.name) || 'My Account'
  }

  entriesForIdentity (identity) {
    return this._memo(identity, 'entries', () => {
      return this.sortEntries(this.state.findAll(identity.id, 'entries'))
    }, ['entries'])
  }

  // The entries a roll up carries forward. Per feed, because one cap over the
  // whole list is spent on whichever feeds sort first and leaves every other
  // one with nothing behind it.
  entriesWorthKeepingForIdentity (identity, keepReadPerFeed = KEEP_READ_PER_FEED) {
    const kept = {}

    return this.entriesForIdentity(identity).filter((entry) => {
      if (!this.isEntryRead(entry) || this.isEntrySaved(entry)) {
        return true
      }

      kept[entry.feedId] = (kept[entry.feedId] || 0) + 1

      return kept[entry.feedId] <= keepReadPerFeed
    })
  }

  entriesForSignal (identity, signal) {
    return this._memo(identity, `signal:${this.keyForSignal(signal)}`, () => {
      const filter = this.signalFunction(signal, 'filter')
      const sort = this.signalFunction(signal, 'sort')

      // Already ordered by entriesForIdentity, so only a signal with its own
      // comparator re-sorts, and it copies rather than reordering the cache.
      let entries = this.entriesForIdentity(identity)

      if (filter) {
        entries = entries.filter(filter)
      }

      if (sort) {
        entries = entries.slice(0).sort(sort)
      }

      return entries
    }, ['entries', 'signals'])
  }

  keyForSignal (signal) {
    if (!signal) {
      return 'none'
    }

    return signal.id || this.permalinkForSignal(signal) || 'unknown'
  }

  // Compiling the same source on every render was a measurable slice of the
  // sidebar, so each distinct source is compiled once.
  signalFunction (signal, attr) {
    const source = signal && signal.data && signal.data[attr]

    if (!source) {
      return null
    }

    this._compiled = this._compiled || {}

    if (!(source in this._compiled)) {
      let func = null

      try {
        func = eval(source)(this) // eslint-disable-line no-eval
      } catch (e) { }

      this._compiled[source] = typeof func === 'function' ? func : null
    }

    return this._compiled[source]
  }

  cardsForIdentityForSignal (identity, signal) {
    if (!this.signalHasCards(signal)) {
      return []
    }

    const entries = this.entriesForSignal(identity, signal)
      .filter((entry) => !this.isEntryRead(entry))
      .map((entry) => this.contentForEntry(entry))
      .map((content) => stripHTML(content))

    return signal.cards(entries)
  }

  unreadEntriesForSignalLength (identity, signal) {
    return this._memo(identity, `unread:${this.keyForSignal(signal)}`, () => {
      let count = 0

      this.entriesForSignal(identity, signal).forEach((entry) => {
        if (!this.isEntryRead(entry)) count++
      })

      return count
    }, ['entries', 'signals'])
  }

  entriesForFeed (identity, feed) {
    return this._memo(identity, `entriesForFeed:${feed.id}`, () => {
      // The index is built off the raw collection, so deleted entries are
      // filtered here rather than by the state layer.
      return this.sortEntries(this.rawEntriesForFeed(identity, feed).filter((entry) => !entry._deleted))
    }, ['entries'])
  }

  // Unsorted and including deleted, straight off the incremental index.
  // Callers that do not care about order use this and skip the sort.
  rawEntriesForFeed (identity, feed) {
    return this._entryIndex(identity).byFeed.get(feed.id) || []
  }

  // Entries are only ever appended, so this walks what is new since it last
  // ran rather than rebuilding. That matters because fetching a feed writes an
  // event per entry, and a rebuild-per-write is quadratic.
  _entryIndex (identity) {
    this._indexes = this._indexes || {}

    const raw = this.state.rawCollection(identity.id, 'entries')
    const generation = this.state.generationFor(identity.id)
    const index = this._indexes[identity.id] = this._indexes[identity.id] || { cursor: 0, generation, byFeed: new Map(), byKey: new Map() }

    // A re-fold (import, reset) builds every projection object afresh, so what
    // is indexed now points at objects nothing else references. The count is no
    // help: folding a save or a markRead leaves it unchanged.
    if (index.generation !== generation || index.cursor > raw.length) {
      index.generation = generation
      index.cursor = 0
      index.byFeed = new Map()
      index.byKey = new Map()
    }

    for (let i = index.cursor; i < raw.length; i++) {
      const entry = raw[i]
      const bucket = index.byFeed.get(entry.feedId)

      bucket ? bucket.push(entry) : index.byFeed.set(entry.feedId, [entry])

      try {
        index.byKey.set(`${entry.feedId}\u0000${this.keyForEntry(entry)}`, entry)
      } catch (e) { }
    }

    index.cursor = raw.length

    return index
  }

  // What the Feeds page is actually for: "has this one got anything new?"
  unreadEntriesForFeedLength (identity, feed) {
    return this.entriesForFeed(identity, feed)
      .filter((entry) => !this.isEntryRead(entry))
      .length
  }

  lastEntryForFeed (identity, feed) {
    return this.entriesForFeed(identity, feed)[0]
  }

  jsonFromXml (xml) {
    if (!xml) {
      return {}
    }

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

  // The order is load-bearing and must not be tidied: it is what every stored
  // entry was keyed by, and an entry that keys differently tomorrow comes back
  // as a duplicate of itself. The first four are what has always been read.
  // The rest are additions, so they can only catch entries that used to have
  // no key at all.
  keyForEntry (entry) {
    const data = (entry || {}).data || {}

    const key = getAttr(entry, 'id') ||
      textOnly(data.guid) ||
      textOnly(data.link) ||
      getAttr(entry, 'guid.#text') ||
      hrefOf(data.guid) ||
      hrefOf(data.link) ||
      this.fallbackKeyForEntry(entry)

    if (key) {
      return key
    }

    throw new UnkeyableEntryError(entry)
  }

  // What the entry says it is, for a feed that offers nothing to identify it
  // by. Not stable if the feed edits a title, so it is the last resort — but
  // the alternative was dropping the item and everything after it.
  fallbackKeyForEntry (entry) {
    const title = `${this.titleForEntry(entry) || ''}`.trim()
    const date = this.dateForEntry(entry)
    const stamp = isNaN(date.getTime()) ? '' : date.toISOString()

    if (!title && !stamp) {
      return ''
    }

    return `followalong:${title}|${stamp}`
  }

  entryForIdentity (identity, entryId) {
    return this.state.findById(identity.id, 'entries', entryId)
  }

  entryForFeedForIdentity (identity, feed, key) {
    const entry = this._entryIndex(identity).byKey.get(`${feed.id}\u0000${key}`)

    if (entry && !entry._deleted) {
      return entry
    }

    // The index keeps the last entry it saw under a key, and after duplicates
    // are merged that can be the copy that lost. Answering "not here" would
    // have the next poll store the article all over again, so a deleted one
    // sends us looking for the copy that survived.
    if (!entry) {
      return undefined
    }

    return this.rawEntriesForFeed(identity, feed).find((one) => {
      if (one._deleted) {
        return false
      }

      try {
        return this.keyForEntry(one) === key
      } catch (e) {
        return false
      }
    })
  }

  feedsForIdentity (identity) {
    return this._memo(identity, 'feeds', () => {
      return this.state.findAll(identity.id, 'feeds')
        .sort(SORT_BY_FEED_TITLE(this))
    }, ['feeds'])
  }

  unpausedFeedsForIdentity (identity) {
    return this.feedsForIdentity(identity)
      .filter((feed) => !this.isFeedPaused(feed))
  }

  // A feed with no url cannot be fetched. Asking anyway makes the proxy addon
  // reject, and the rejection surfaces as an unhandled one on every poll.
  feedsToFetchForIdentity (identity) {
    return this.unpausedFeedsForIdentity(identity)
      .filter((feed) => this.urlForFeed(feed))
      .filter((feed) => !this.isFeedInBackoff(feed))
  }

  validatorsForFeed (feed) {
    const validators = {}

    if (feed.etag) validators.etag = feed.etag
    if (feed.lastModified) validators.lastModified = feed.lastModified

    return validators
  }

  // What to tell the reader when a feed stops answering. Kept as a query so
  // the message survives a reload rather than living in a view's state.
  // Items the last body carried that could not be stored. A feed reporting
  // one is not failing — it is arriving incomplete, which is a different
  // thing and used to be invisible.
  skippedEntriesForFeed (feed) {
    return (feed && feed.skippedEntries) || 0
  }

  fetchErrorForFeed (feed) {
    if (!feed || !feed.failedAt) return null

    const host = hostFor(this.urlForFeed(feed))

    // A failure that knows why says so. Only the ones that do not fall back to
    // the host and the status, which is all we can say about them.
    if (feed.failureReason) return `${host} ${feed.failureReason}`

    if (!feed.failureStatus) return `${host} could not be reached`

    return `${host} refused the request (${feed.failureStatus})`
  }

  failureCountForFeed (feed) {
    return feed.failureCount || 0
  }

  // A feed that keeps refusing is asked less and less often, up to a day. One
  // unreachable feed polled every cycle is what gets a shared proxy blocked.
  backoffUntilForFeed (feed) {
    if (!feed.failedAt) return 0

    const backoff = Math.min(
      BACKOFF_BASE_MINUTES * Math.pow(2, this.failureCountForFeed(feed) - 1),
      BACKOFF_MAX_MINUTES
    )

    return feed.failedAt + (backoff * 60 * 1000)
  }

  isFeedInBackoff (feed) {
    return this.backoffUntilForFeed(feed) > Date.now()
  }

  // Failed, but not because anything answered: no status means no HTTP
  // response ever came back.
  feedsWithUnrefusedFailureForIdentity (identity) {
    return this.feedsForIdentity(identity)
      .filter((feed) => feed.failedAt && !feed.failureStatus)
  }

  feedsWithoutUrlForIdentity (identity) {
    return this.feedsForIdentity(identity)
      .filter((feed) => !this.urlForFeed(feed))
  }

  lastUpdatedForFeed (feed) {
    return feed.updatedAt
  }

  findOutdatedFeedsForIdentity (identity) {
    const outdatedDate = Date.now() - (OUTDATED_MINUTES * (60 * 1000))

    return this.feedsToFetchForIdentity(identity)
      .filter((feed) => this.lastUpdatedForFeed(feed) < outdatedDate)
      .sort(SORT_BY_NEED_TO_UPDATE(this))
  }

  feedForIdentity (identity, feedId) {
    return this.state.findById(identity.id, 'feeds', feedId)
  }

  feedForIdentityByUrl (identity, feedUrl) {
    return this.state.findAll(identity.id, 'feeds')
      .find((f) => this.urlForFeed(f) === feedUrl)
  }

  titleForEntry (entry) {
    return getAttr(entry, 'title')
  }

  urlForFeed (feed) {
    return (feed || {}).url
  }

  linkForEntry (entry) {
    return getAttr(entry, 'link.href') ||
      getAttr(entry, 'url.href') ||
      getAttr(entry, 'link.@_href')
  }

  titleForFeed (feed) {
    return getAttr(feed, 'title') ||
      this.urlForFeed(feed) ||
      'Untitled feed'
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

  // The body as the feed wrote it. Everything a card needs comes from here;
  // only the reader pays to have it sanitised.
  rawContentForEntry (entry) {
    return getAttr(entry, 'content:encoded') ||
      getAttr(entry, 'content.#text') ||
      getAttr(entry, 'description') ||
      getAttr(entry, 'media:group.media:description') ||
      ''
  }

  contentForEntry (entry) {
    return sanitizeContent(this.rawContentForEntry(entry))
  }

  // Whether there is a body worth opening the reader for. Every card asks, so
  // it must not be the question that parses one.
  hasContentForEntry (entry) {
    return !!this.rawContentForEntry(entry)
  }

  excerptForEntry (entry) {
    return excerpt(this.rawContentForEntry(entry))
  }

  excerptFrom (html) {
    return excerpt(html)
  }

  sanitizeCopy (content) {
    return sanitizeContent(content)
  }

  imageForFeed (feed) {
    return getAttr(feed, 'image.url') ||
      getAttr(feed, 'webfeeds:icon')
  }

  feedChanged (feed, newData) {
    newData = Object.assign({}, newData)

    for (const key in newData) {
      if (key.toLowerCase().indexOf('date') !== -1) {
        delete newData[key]
      }
    }

    return objHasNewData(feed.data, newData)
  }

  entryChanged (entry, newData) {
    return objHasNewData(entry.data, newData)
  }

  savedEntriesForIdentity (identity) {
    return this._memo(identity, 'saved', () => {
      return this.entriesForIdentity(identity)
        .filter((entry) => this.isEntrySaved(entry))
    }, ['entries'])
  }

  isEntrySaved (entry) {
    return !!(entry && entry.savedAt)
  }

  isEntryRead (entry) {
    return !!entry.readAt
  }

  isFeedPaused (feed) {
    return !!feed.pausedAt
  }

  unreadEntries (entries) {
    return entries.filter((entry) => !this.isEntryRead(entry))
  }

  // Unread first, then newest first. Decorated so each entry's date is derived
  // once rather than on both sides of every comparison.
  sortEntries (entries) {
    return entries
      .map((entry) => ({ entry, read: this.isEntryRead(entry), time: this.dateForEntry(entry).getTime() || 0 }))
      .sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1
        return b.time - a.time
      })
      .map((decorated) => decorated.entry)
  }

  sortEntriesByTime (entries) {
    return entries.slice(0).sort(SORT_BY_TIME(this))
  }

  // The None adapter answers save() by resolving and doing nothing, so an
  // identity with no add-on would otherwise look permanently backed up.
  remoteAdapterForIdentity (identity) {
    const adapter = this.addonAdapterForActionForIdentity(identity, 'save')

    return adapter && adapter.adapter !== 'none' ? adapter : null
  }

  // Only the runs that ended without saying goodbye. Never throws: a broken
  // diagnostic must not take the page that shows it down with it.
  restartsForIdentity (identity) {
    try {
      if (!identity) return []

      return deaths(sessionsIn(this.state.getConfig(identity.id)))
    } catch (e) {
      return []
    }
  }

  syncStatusForIdentity (identity) {
    if (!identity) return { status: 'off', at: 0, error: '', target: '' }

    const config = this.state.getConfig(identity.id) || {}
    const remote = this.remoteAdapterForIdentity(identity)

    if (!remote) return { status: 'off', at: 0, error: '', target: '' }

    return {
      // 'off' describes having nowhere to sync to, so a remote being
      // configured retires it, whatever the last run left behind.
      status: !config.syncStatus || config.syncStatus === 'off' ? 'idle' : config.syncStatus,
      at: config.syncedAt || 0,
      error: config.syncError || '',
      // Not a failed backup, and it must not be shown as one: what was saved
      // is still saved. It is this device having lost sight of the bucket,
      // which is worth knowing before the next write finds out the hard way.
      checkError: config.checkError ? `Could not check the backup (${config.checkError})` : '',
      target: remote.title || remote.type
    }
  }

  // Events on disk that this session's password could not open. They are not
  // lost — they simply did not load, and saying so beats showing an empty app.
  backupContentsForIdentity (identity) {
    return {
      feeds: this.feedsForIdentity(identity).length,
      entries: this.entriesForIdentity(identity).length,
      events: this.findAllEvents(identity).length
    }
  }

  lastBackgroundFetchForIdentity (identity) {
    return this.state.getConfig(identity.id).lastBackgroundFetch || this.state.startedAt
  }

  filterNewEntries (identity, entries) {
    const since = this.lastBackgroundFetchForIdentity(identity)

    return entries
      .filter((e) => !this.isEntryRead(e))
      .filter((e) => e.createdAt > since)
  }

  filterNonNewEntries (identity, entries) {
    const since = this.lastBackgroundFetchForIdentity(identity)

    return entries
      .filter((e) => e.createdAt <= since)
  }

  videoForEntry (entry) {
    const youtubeId = getAttr(entry, 'id')
    if (typeof youtubeId === 'string' && youtubeId.slice(0, 9) === 'yt:video:') {
      return `https://www.youtube.com/embed/${youtubeId.slice(9)}?&rel=0&modestbranding=1&playsinline=1`
    }

    if (getAttr(entry, 'media:player')) {
      return getAttr(entry, 'media:player')
    }

    const attrs = [
      'link',
      'media:content.video.@_url',
      'media:content.video.url',
      'media:content.@_url',
      'media:content.url',
      'enclosure.video.@_url',
      'enclosure.video.url',
      'enclosure.@_url',
      'enclosure.url'
    ]

    for (var i = 0; i < attrs.length; i++) {
      const val = getAttr(entry, attrs[i])

      if (VIDEO_TYPES.test(val) || `${val}`.indexOf('embed') !== -1) {
        return val
      }
    }
  }

  audioForEntry (entry) {
    const attrs = [
      'link',
      'media:content.audio.@_url',
      'media:content.audio.url',
      'media:content.@_url',
      'media:content.url',
      'enclosure.audio.@_url',
      'enclosure.audio.url',
      'enclosure.@_url',
      'enclosure.url'
    ]

    for (var i = 0; i < attrs.length; i++) {
      const val = getAttr(entry, attrs[i])

      if (AUDIO_TYPES.test(val)) {
        return val
      }
    }
  }

  imageForEntry (entry) {
    for (var n = 0; n < NAMED_IMAGE_ATTRS.length; n++) {
      const named = getAttr(entry, NAMED_IMAGE_ATTRS[n])

      if (named) {
        return named
      }
    }

    for (var i = 0; i < MAYBE_IMAGE_ATTRS.length; i++) {
      const val = getAttr(entry, MAYBE_IMAGE_ATTRS[i])

      if (IMAGE_TYPES.test(val)) {
        return val
      }
    }
  }

  signalsForIdentity (identity) {
    return this._memo(identity, 'signals', () => {
      const signals = this.signalsForIdentityForProjection(identity)
      const addonAdaptersWithSignals = this.addonAdaptersForActionForIdentity(identity, 'signals')

      return addonAdaptersWithSignals
        .reduce((arr, addon) => arr.concat(addon.signals()), signals.slice(0))
        .sort(SORT_BY_ORDER)
    }, ['signals', 'addons'])
  }

  signalsForIdentityForProjection (identity) {
    return this.state.findAll(identity.id, 'signals')
  }

  signalHasCards (signal) {
    return signal && typeof signal.cards === 'function'
  }

  addonsForIdentity (identity) {
    return this.state.findAll(identity.id, 'addons')
  }

  permalinkForSignal (signal) {
    return getAttr(signal, 'permalink')
  }

  iconForSignal (signal) {
    return getAttr(signal, 'icon')
  }

  titleForSignal (signal) {
    return getAttr(signal, 'title')
  }

  descriptionForSignal (signal) {
    return getAttr(signal, 'description')
  }

  signalForIdentity (identity, permalink) {
    return this.signalsForIdentity(identity)
      .find((s) => this.permalinkForSignal(s) === permalink)
  }

  defaultSignalForIdentity (identity) {
    return this.signalsForIdentity(identity)[0]
  }

  findAddonForIdentity (identity, id) {
    return this.addonsForIdentity(identity)
      .find((addon) => addon.id === id)
  }

  adapterForAddonForIdentity (identity, addon) {
    const Adapter = ADAPTERS.find((Adapter) => Adapter.name === addon.type) || None
    const adapter = new Adapter({ fetch: this.fetch, awsClient: this.awsClient }, addon)

    return adapter
  }

  addonAdaptersForIdentity (identity) {
    return this._memo(identity, 'addonAdapters', () => {
      return this.state.findAll(identity.id, 'addons')
        .map((addon) => this.adapterForAddonForIdentity(identity, addon))
    }, ['addons'])
  }

  addonAdaptersForActionForIdentity (identity, action) {
    const adapters = this.addonAdaptersForIdentity(identity).concat([new None(this, {})])

    return adapters.filter((a) => typeof a[action] === 'function')
  }

  addonAdapterForActionForIdentity (identity, action) {
    return this.addonAdaptersForActionForIdentity(identity, action)[0]
  }

  // Every add-on there is, each carrying the identity's own record when it has
  // one — that is what lets a listing show which are already installed.
  availableAddonAdaptersForIdentity (identity) {
    const installed = this.addonsForIdentity(identity)

    return ADAPTERS.map((Adapter) => {
      const addon = installed.find((a) => a.type === Adapter.name)

      return new Adapter({ fetch: this.fetch, awsClient: this.awsClient }, addon || {})
    })
  }

  isFunctionSupportedByAddon (addon, funcName) {
    return typeof addon[funcName] === 'function'
  }

  labelsForAddon (addon) {
    const labels = []

    if (this.isFunctionSupportedByAddon(addon, 'rss')) {
      labels.push('RSS')
    }

    if (this.isFunctionSupportedByAddon(addon, 'signals')) {
      labels.push('Signal')
    }

    return labels
  }

  linkify (text) {
    return linkifyHtml(text, { target: '_blank' })
  }

  findAllEvents (identity) {
    return this.state.findAllEvents(identity.id)
  }

  // The synced payload: the event log itself, in the same shape importRaw
  // reads back, so syncing is append-and-merge rather than last-writer-wins.
  eventsToFile (identity) {
    return this.findAllEvents(identity)
      .map((event) => `${event.key} ${event.toLocal() || ''}`.trim())
      .join('\n')
  }

  metasForEntryForIdentity (identity, entry) {
    const addonAdapters = this.addonAdaptersForActionForIdentity(identity, 'entryMeta')

    return addonAdapters
      .map((meta) => meta.entryMeta(entry, { contentForEntry: this.contentForEntry }))
      .filter((meta) => meta)
      .map((meta) => {
        return { content: this.sanitizeCopy(meta.content) }
      })
  }

  lastReadDateForFeed (identity, feed) {
    return this.rawEntriesForFeed(identity, feed)
      .reduce((latest, entry) => {
        if (entry._deleted || !this.isEntryRead(entry)) return latest

        return Math.max(latest, this.dateForEntry(entry).getTime() || 0)
      }, 0)
  }
}

export default Queries
