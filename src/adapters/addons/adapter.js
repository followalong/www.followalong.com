class Adapter {
  constructor (adapterOptions, addonData) {
    this.data = addonData || {}
    this.fields = []

    for (const key in adapterOptions) {
      this[key] = adapterOptions[key]
    }
  }

  get () {
    return Promise.reject(new Error('`Get` is not supported by this addon.'))
  }

  save () {
    return Promise.reject(new Error('`Save` is not supported by this addon.'))
  }

  destroy () {
    return Promise.reject(new Error('`Destroy` is not supported by this addon.'))
  }

  rss () {
    return Promise.reject(new Error('`RSS` is not supported by this addon.'))
  }

  search () {
    return Promise.reject(new Error('`Search` is not supported by this addon.'))
  }

  format (identityData) {
    const addons = identityData.addons || {}

    return {
      id: identityData.id,
      name: identityData.name,
      hints: Object.assign([], identityData.hints || []),
      feeds: identityData.feeds.map((feed) => {
        return {
          updatedAt: feed.updatedAt,
          pausedAt: feed.pausedAt,
          latestInteractionAt: feed.latestInteractionAt,
          name: feed.name,
          url: feed.url
        }
      }),
      items: identityData.items.map((item) => {
        return {
          author: item.author,
          feedUrl: item.feedUrl,
          guid: item.guid,
          image: this._buildObj(item.image),
          readAt: item.readAt,
          savedAt: item.savedAt,
          link: item.link,
          enclosure: this._buildObj(item.enclosure),
          pubDate: item.pubDate,
          title: item.title,
          content: item.content,
          updatedAt: item.updatedAt
        }
      }),
      addons: {
        local: this._buildObj(addons.local || {}),
        rss: this._buildObj(addons.rss || {}),
        search: this._buildObj(addons.search || {}),
        sync: this._buildObj(addons.sync || {})
      }
    }
  }

  preview () {
    return this.data.name || this.name
  }

  _buildObj (obj) {
    if (!obj) {
      return undefined
    }

    const data = {}

    for (const key in obj) {
      data[key] = obj[key]
    }

    return data
  }
}

export default Adapter
