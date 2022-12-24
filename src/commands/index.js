const ARRAYABLE = 'entry'
const serializeDOM = ($el, obj = {}) => {
  const $children = [...$el.children]

  $children.forEach(($child) => {
    const child = {}
    const tagName = $child.tagName.toLowerCase()

    $child.getAttributeNames().forEach((attr) => {
      child[attr] = $child.getAttribute(attr)
    })

    if (!$child.children.length) {
      child._ = $child.innerHTML
      obj[tagName] = child
      return
    }

    if (ARRAYABLE.indexOf(tagName) !== -1 && !(obj[tagName] instanceof Array)) {
      obj[tagName] = typeof obj[tagName] !== 'undefined' ? [obj[tagName]] : []
    }

    if (obj[tagName] instanceof Array) {
      obj[tagName].push(serializeDOM($child, {}))
    } else {
      obj[tagName] = child
    }
  })

  return obj
}

const parseXML = (xml) => {
  const $wrapper = document.createElement('div')
  $wrapper.innerHTML = xml

  const $feed = $wrapper.querySelector('feed')

  return serializeDOM($feed)
}

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
      url: 'https://changelog.followalong.com/feed.xml',
      title: 'Follow Along',
      description: 'Stay in-the-know on Follow Along.',
      image: {
        url: 'https://www.followalong.net/img/favicon.ico'
      }
    })
    const feed = this.queries.latestFeedForIdentity(identity)
    this.addEntryToIdentity(identity, {
      feedUrl: feed.url,
      guid: 'about',
      title: 'Twitter is done. Long live RSS.',
      published: new Date().toISOString(),
      'content:encoded': 'Welcome to new.'
    })
  }

  addFeedToIdentity (identity, feed) {
    this.track(identity, 'feeds', null, 'create', feed)
  }

  addEntryToIdentity (identity, entry) {
    if (!entry.feedUrl) {
      throw new Error('Entry has no `feedUrl`')
    }

    if (false && 'exists!') {
      this.track(identity, 'entries', 'entry.id', 'fetch', 'diff')
    } else {
      this.track(identity, 'entries', null, 'create', entry)
    }
  }

  track (identity, collectionName, objectId, action, data) {
    this.state.track(identity.id, collectionName, objectId, action, data)
  }

  restoreFromLocal () {
    return this.state.restore()
  }

  fetchUrl (url) {
    return fetch(url)
      .then((response) => response.text())
      .then(parseXML)
  }

  fetchFeed (identity, feed) {
    const feedUrl = this.queries.urlForFeed(feed)

    return this.fetchUrl(feedUrl)
      .then((remoteFeed) => {
        remoteFeed.entry.forEach((entry) => {
          entry.feedUrl = feedUrl
          this.addEntryToIdentity(identity, entry)
        })
      })
  }
}

export default Commands
