import { getAddonAdapterByType } from '../adapters/addons/index.js'
import sortByReadAndDate from './sorters/sort-by-read-and-date.js'
import sortByName from './sorters/sort-by-name.js'
import sortByNeedToUpdate from './sorters/sort-by-need-to-update.js'
import { getAudioSrc, getVideoSrc, getImageSrc } from './helpers/get-src.js'
import prepareContent from './helpers/prepare-content.js'
import timeAgo from './helpers/time-ago.js'
import { encrypt, decrypt } from './helpers/crypt.js'
import localforage from 'localforage'

const WORD_LIMIT = 125

class Queries {
  constructor (options) {
    for (const key in options) {
      this[key] = options[key]
    }
  }

  feedForItem (item) {
    if (!item) {
      return
    }

    return this.state.find('feeds', (f) => f.url === item.feedUrl)
  }

  itemsForFeed (feed) {
    if (!feed) {
      return
    }

    return this.state.findAll('items', (i) => i.feedUrl === feed.url).sort(sortByReadAndDate())
  }

  findIdentity (id) {
    return this.state.find('identities', (identity) => identity.id === id)
  }

  identityForFeed (feed) {
    if (!feed) {
      return
    }

    return this.state.find('identities', (i) => i.id === feed.identityId)
  }

  addonForIdentity (identity, type) {
    identity.addons = identity.addons || {}
    identity.addons[type] = identity.addons[type] || {}

    const addonAdapter = type === 'local' ? 'local' : identity.addons[type].adapter || 'none'
    const Addon = getAddonAdapterByType(addonAdapter)

    return new Addon(this.addonAdapterOptions, identity.addons[type])
  }

  feedsForIdentity (identity) {
    return this.state.findAll('feeds', (f) => f.identityId === identity.id).sort(sortByName)
  }

  feedsForIdentityWithQuery (identity, q) {
    q = (q || '').trim().toLowerCase()

    if (!q.length) {
      return []
    }

    return this.feedsForIdentity(identity)
      .filter((feed) => (feed.name || '').toLowerCase().indexOf(q) !== -1)
  }

  itemsForIdentity (identity) {
    return this.feedsForIdentity(identity)
      .reduce((items, f) => items.concat(this.itemsForFeed(f)), [])
      .sort(sortByReadAndDate())
  }

  itemsForIdentityWithQuery (identity, q) {
    q = (q || '').trim().toLowerCase()

    if (!q.length) {
      return []
    }

    return this.itemsForIdentity(identity)
      .filter((item) => item.title.toLowerCase().indexOf(q) !== -1)
  }

  hintIsShown (identity, hint) {
    return (identity.hints || []).indexOf(hint) === -1
  }

  findDefaultIdentity () {
    return this.state.findAll('identities')[0]
  }

  unreadItems (feed) {
    return this.itemsForFeed(feed).filter((item) => this.isUnread(item))
  }

  findFeedByUrl (url) {
    return this.state.find('feeds', (f) => f.url === url)
  }

  findItemById (guid) {
    return this.state.find('items', (i) => i.guid === guid)
  }

  allIdentities () {
    return this.state.findAll('identities')
  }

  allFeeds () {
    return this.state.findAll('feeds')
  }

  findOutdatedFeeds (identity) {
    const OUTDATED_MINUTES = 10 * (60 * 1000)
    const outdatedDate = Date.now() - OUTDATED_MINUTES

    return this.feedsForIdentity(identity)
      .filter(this.isNotPaused)
      .filter((feed) => feed.updatedAt < outdatedDate)
      .sort(sortByNeedToUpdate)
  }

  identityToLocal (identity) {
    return {
      id: identity.id,
      name: identity.name,
      hints: identity.hints,
      feeds: this.feedsForIdentity(identity),
      items: this.itemsForIdentity(identity),
      addons: identity.addons
    }
  }

  identityToRemote (identity) {
    return {
      id: identity.id,
      name: identity.name,
      hints: identity.hints,
      feeds: this.feedsForIdentity(identity),
      items: this.itemsForIdentity(identity).filter(this.isSaved),
      addons: identity.addons
    }
  }

  getLocalDecryptionFunction (id) {
    return new Promise((resolve, reject) => {
      return this.getLocalEncryptionKey(id)
        .then((key) => resolve(decrypt(key)))
        .catch(reject)
    })
  }

  getLocalEncryptionFunction (id) {
    return new Promise((resolve, reject) => {
      return this.getLocalEncryptionKey(id)
        .then((key) => resolve(encrypt(key)))
        .catch(reject)
    })
  }

  getLocalEncryptionKey (id) {
    return new Promise((resolve, reject) => {
      this.keychainAdapter.getKey(id)
        .then(resolve)
        .catch(reject)
    })
  }

  localSize (identity) {
    return new Promise((resolve, reject) => {
      this.getLocalEncryptionFunction(identity.id)
        .then((func) => {
          let data = func(this.identityToLocal(identity))

          if (typeof data === 'object') {
            data = JSON.stringify(data)
          }

          resolve(this._getSize(data))
        })
        .catch(reject)
    })
  }

  remoteSize (identity) {
    return new Promise((resolve, reject) => {
      this.getLocalEncryptionFunction(identity.id)
        .then((func) => {
          let data = func(this.identityToRemote(identity))

          if (typeof data === 'object') {
            data = JSON.stringify(data)
          }

          resolve(this._getSize(data))
        })
        .catch(reject)
    })
  }

  // TODO: Are these presenters?

  itemContent (item) {
    return prepareContent(item.content || '')
  }

  itemShortContent (item) {
    const words = (item.content || '').split(/\s+/)
    const content = `${words.slice(0, WORD_LIMIT).join(' ').trim()}...`

    return `${prepareContent(content)}...`
  }

  prettyPublishedDate (item) {
    return timeAgo(new Date(item.pubDate), new Date())
  }

  isPaused (feed) {
    if (!feed) {
      return false
    }

    return !!feed.pausedAt
  }

  isNotPaused (feed) {
    if (!feed) {
      return false
    }

    return !feed.pausedAt
  }

  isFetching (feed) {
    if (!feed) {
      return false
    }

    return !!feed.fetchingAt
  }

  isSaved (item) {
    if (!item) {
      return false
    }

    return !!item.savedAt
  }

  isRead (item) {
    if (!item) {
      return false
    }

    return !!item.readAt
  }

  isNotRead (item) {
    if (!item) {
      return false
    }

    return !item.readAt
  }

  isUnread (item) {
    if (!item) {
      return false
    }

    return !item.readAt
  }

  isListenable (item) {
    return getAudioSrc(item)
  }

  isWatchable (item) {
    return getVideoSrc(item)
  }

  isReadable (item) {
    return !getVideoSrc(item) && !getAudioSrc(item)
  }

  hasMedia (item) {
    return getVideoSrc(item) || getAudioSrc(item)
  }

  hasImage (item) {
    return getImageSrc(item)
  }

  hasChangeablePassword (addon) {
    return addon.data.encryptionStrategy === 'ask' || addon.data.encryptionStrategy === 'store'
  }

  hasStorageSupport () {
    return localforage.supports(localforage.INDEXEDDB) || localforage.supports(localforage.WEBSQL) || localforage.supports(localforage.LOCALSTORAGE)
  }

  newItemsCount (identity) {
    return identity.newItemsCount
  }

  isNew (item) {
    return item.isNew
  }

  isNotNew (item) {
    return !item.isNew
  }

  _getSize (data) {
    let size = data.length
    let unit = 'b'

    if (size > 1000000) {
      size = size / 1000000
      unit = 'mb'
    } else if (size > 1000) {
      size = size / 1000
      unit = 'kb'
    }

    return '~' + (Math.round(size * 10) / 10) + ' ' + unit
  }
}

export default Queries
