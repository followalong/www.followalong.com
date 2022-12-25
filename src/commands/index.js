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
      if (typeof obj[tagName] !== 'undefined') {
        console.log(tagName)
        return
      }

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
      link: {
        href: 'https://changelog.followalong.com/feed.xml'
      },
      title: 'Follow Along',
      description: 'Stay in-the-know on Follow Along.',
      image: {
        url: 'https://www.followalong.net/img/favicon.ico'
      }
    })
    const feed = this.queries.latestFeedForIdentity(identity)
    this.upsertEntryForIdentity(identity, feed, {
      id: 'about',
      title: 'Twitter is done. Long live RSS.',
      published: new Date().toISOString(),
      'content:encoded': 'Welcome to new.'
    })
  }

  addFeedToIdentity (identity, data) {
    this.track(identity, 'feeds', null, 'create', { url: this.queries.urlForFeed({ data }), data })
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
    return this.fetchUrl(feed.url)
      .then((data) => {
        this.upsertFeedForIdentity(identity, feed, data)
        data.entry.forEach((entry) => {
          this.upsertEntryForIdentity(identity, feed, entry)
        })
      })
  }

  upsertFeedForIdentity (identity, feed, data) {
    if (this.queries.feedChanged(feed, data)) {
      this.track(identity, 'feeds', feed.id, 'update', { data })
    }
  }

  upsertEntryForIdentity (identity, feed, data) {
    const key = this.queries.entryKey(data)
    const found = this.queries.entryForFeedForIdentity(identity, feed, key)

    if (!found) {
      this.track(identity, 'entries', null, 'create', { feedId: feed.id, data })
      return
    }

    if (this.queries.entryChanged(found, data)) {
      this.track(identity, 'entries', found.id, 'update', { data })
    }
  }
}

export default Commands
