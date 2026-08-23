import { XMLParser } from 'fast-xml-parser'
import linkifyHtml from 'linkify-html'
import { ADAPTERS, None } from './addons.js'
import SORT_BY_ORDER from './sorters/sort-by-order.js'
import SORT_BY_TIME from './sorters/sort-by-time.js'
import SORT_BY_FEED_TITLE from './sorters/sort-by-feed-title.js'
import SORT_BY_NEED_TO_UPDATE from './sorters/sort-by-need-to-update.js'
import sanitizeContent from './presenters/sanitize-content.js'

const VIDEO_TYPES = /\.(mp4)/
const AUDIO_TYPES = /\.(mp3|wav)/
const IMAGE_TYPES = /\.(png|jpeg|jpg|gif)/

const parser = new XMLParser({
  ignoreAttributes: false,
  isArray: (name, jpath, isLeafNode, isAttribute) => {
    return ['entry', 'item'].indexOf(name) !== -1
  }
})

const stripHTML = (html) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

const objHasNewData = (existingObj, newData) => {
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
  // against the store's revision and thrown away the moment an event lands.
  _memo (identity, key, build) {
    const revision = this.state.revisionFor(identity.id)

    this._cache = this._cache || {}

    const slot = this._cache[identity.id] = this._cache[identity.id] || { revision: -1, values: {} }

    if (slot.revision !== revision) {
      slot.revision = revision
      slot.values = {}
    }

    if (!(key in slot.values)) {
      slot.values[key] = build()
    }

    return slot.values[key]
  }

  allIdentities () {
    return this.state.findAll(null, 'identities')
  }

  entriesForIdentity (identity, maxOldItems = null) {
    let entries = this._memo(identity, 'entries', () => {
      return this.sortEntries(this.state.findAll(identity.id, 'entries'))
    })

    if (maxOldItems) {
      let oldItems = 0

      entries = entries.filter((entry) => {
        if (this.isEntryRead(entry)) {
          oldItems++

          return oldItems <= maxOldItems
        }

        return true
      })
    }

    return entries
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
    })
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
    })
  }

  entriesForFeed (identity, feed) {
    return this._memo(identity, `entriesForFeed:${feed.id}`, () => {
      // The index is built off the raw collection, so deleted entries are
      // filtered here rather than by the state layer.
      return this.sortEntries(this.rawEntriesForFeed(identity, feed).filter((entry) => !entry._deleted))
    })
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

  keyForEntry (entry) {
    const key = getAttr(entry, 'id') ||
      getAttr(entry, 'guid.href') ||
      getAttr(entry, 'link.href') ||
      getAttr(entry, 'guid.#text')

    if (key) {
      return key
    }

    throw new Error(`Cannot find a key for ${JSON.stringify(entry)}`)
  }

  entryForIdentity (identity, entryId) {
    return this.state.findById(identity.id, 'entries', entryId)
  }

  entryForFeedForIdentity (identity, feed, key) {
    const entry = this._entryIndex(identity).byKey.get(`${feed.id}\u0000${key}`)

    return entry && !entry._deleted ? entry : undefined
  }

  feedsForIdentity (identity) {
    return this.state.findAll(identity.id, 'feeds')
      .sort(SORT_BY_FEED_TITLE(this))
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
  }

  feedsWithoutUrlForIdentity (identity) {
    return this.feedsForIdentity(identity)
      .filter((feed) => !this.urlForFeed(feed))
  }

  lastUpdatedForFeed (feed) {
    return feed.updatedAt
  }

  findOutdatedFeedsForIdentity (identity) {
    const OUTDATED_MINUTES = 15
    const outdatedDate = Date.now() - (OUTDATED_MINUTES * (60 * 1000))

    return this.unpausedFeedsForIdentity(identity)
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

  contentForEntry (entry) {
    const content = getAttr(entry, 'content:encoded') ||
      getAttr(entry, 'content.#text') ||
      getAttr(entry, 'description') ||
      getAttr(entry, 'media:group.media:description')

    return sanitizeContent(content || '')
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

  isEntryRead (entry) {
    return !!entry.readAt
  }

  isEntrySaved (entry) {
    return !!entry.savedAt
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
    const attrs = [
      'link',
      'media:group.media:thumbnail.@_url',
      'media:group.media:thumbnail.url',
      'media:content.image.@_url',
      'media:content.image.url',
      'media:content.@_url',
      'media:content.url',
      'enclosure.image.@_url',
      'enclosure.image.url',
      'enclosure.@_url',
      'enclosure.url',
      'itunes.image'
    ]

    for (var i = 0; i < attrs.length; i++) {
      const val = getAttr(entry, attrs[i])

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
    })
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
    const adapter = new Adapter({ fetch: this.fetch, awsS3: this.awsS3 }, addon)

    return adapter
  }

  addonAdaptersForIdentity (identity) {
    return this._memo(identity, 'addonAdapters', () => {
      return this.state.findAll(identity.id, 'addons')
        .map((addon) => this.adapterForAddonForIdentity(identity, addon))
    })
  }

  addonAdaptersForActionForIdentity (identity, action) {
    const adapters = this.addonAdaptersForIdentity(identity).concat([new None(this, {})])

    return adapters.filter((a) => typeof a[action] === 'function')
  }

  addonAdapterForActionForIdentity (identity, action) {
    return this.addonAdaptersForActionForIdentity(identity, action)[0]
  }

  availableAddonAdaptersForIdentity (identity) {
    return ADAPTERS
      .map((Adapter) => new Adapter({}, {}))
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

  readJsonFile (file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => {
        try {
          resolve(JSON.parse(reader.result))
        } catch (e) {
          reject(new Error('That file is not valid JSON.'))
        }
      }

      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })
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
