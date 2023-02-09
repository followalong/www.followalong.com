import { XMLParser } from 'fast-xml-parser'
import linkifyHtml from 'linkify-html'
import { ADAPTERS, None } from './addons.js'
import SORT_BY_ORDER from './sorters/sort-by-order.js'
import SORT_BY_FEED_TITLE from './sorters/sort-by-feed-title.js'
import SORT_BY_TIME from './sorters/sort-by-time.js'
import SORT_BY_TIME_AND_READ from './sorters/sort-by-time-and-read.js'
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

  allIdentities () {
    return this.state.findAll(null, 'identities')
  }

  entriesForIdentity (identity) {
    return this.state.findAll(identity.id, 'entries')
      .sort(SORT_BY_TIME(this))
  }

  entriesForSignal (identity, signal) {
    let entries = this.entriesForIdentity(identity)
    let filter
    let sort

    if (signal && signal.data && signal.data.filter) {
      try {
        filter = eval(signal.data.filter)(this) // eslint-disable-line no-eval
      } catch (e) { }

      if (typeof filter === 'function') {
        entries = entries.filter(filter)
      }
    }

    if (signal && signal.data && signal.data.sort) {
      try {
        sort = eval(signal.data.sort)(this) // eslint-disable-line no-eval
      } catch (e) { }

      if (typeof sort === 'function') {
        entries = entries.sort(sort)
      }
    } else {
      entries = entries.sort(SORT_BY_TIME_AND_READ(this))
    }

    return entries
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
    return this.entriesForSignal(identity, signal)
      .filter((entry) => !this.isEntryRead(entry))
      .length
  }

  entriesForFeed (identity, feed) {
    return this.state.findAll(identity.id, 'entries')
      .filter((e) => e.feedId === feed.id)
      .sort(SORT_BY_TIME_AND_READ(this))
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

  entryForFeedForIdentity (identity, feed, key) {
    return this.entriesForFeed(identity, feed)
      .find((e) => this.keyForEntry(e) === key)
  }

  feedsForIdentity (identity) {
    return this.state.findAll(identity.id, 'feeds')
      .sort(SORT_BY_FEED_TITLE(this))
  }

  unpausedFeedsForIdentity (identity) {
    return this.feedsForIdentity(identity)
      .filter((feed) => !this.isFeedPaused(feed))
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

  latestFeedForIdentity (identity) {
    const feeds = this.state.findAll(identity.id, 'feeds')

    return feeds[feeds.length - 1]
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
    return getAttr(feed, 'title')
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
    return objHasNewData(feed.data, newDataClone)
  }

  entryChanged (entry, newData) {
    return objHasNewData(entry.data, newData)
  }

  isEntryRead (entry) {
    return entry.readAt
  }

  isFeedPaused (feed) {
    return feed.pausedAt
  }

  filterNewEntries (entries) {
    return entries
      .filter((e) => e.createdAt > this.lastBackgroundFetch)
  }

  filterNonNewEntries (entries) {
    return entries
      .filter((e) => e.createdAt <= this.lastBackgroundFetch)
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
    const signals = this.signalsForIdentityForProjection(identity)
    const addonAdaptersWithSignals = this.addonAdaptersForActionForIdentity(identity, 'signals')

    return addonAdaptersWithSignals
      .reduce((arr, addon) => arr.concat(addon.signals()), signals)
      .sort(SORT_BY_ORDER)
  }

  signalsForIdentityForProjection (identity) {
    return this.state.findAll(identity.id, 'signals')
  }

  signalHasCards (signal) {
    return typeof signal.cards === 'function'
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

  adapterPreviewName (Adapter) {
    return new Adapter().preview()
  }

  adapterName (Adapter) {
    return new Adapter().name
  }

  adapterForAddonForIdentity (identity, addon) {
    const Adapter = ADAPTERS.find((Adapter) => Adapter.name === addon.type) || None
    const adapter = new Adapter({ fetch: this.fetch }, addon)

    return adapter
  }

  addonAdaptersForIdentity (identity) {
    return this.state.findAll(identity.id, 'addons')
      .map((addon) => this.adapterForAddonForIdentity(identity, addon))
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

  linkify (text) {
    return linkifyHtml(text, { target: '_blank' })
  }

  findAllEvents (identity) {
    return this.state.findAllEvents(identity.id)
  }
}

export default Queries
