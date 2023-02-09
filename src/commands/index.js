const CHANGELOG_URL = 'https://changelog.followalong.com/feed.xml'

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

    this.addFeedToIdentity(identity, CHANGELOG_URL, {
      title: 'Changelog',
      description: 'Stay in-the-know on Follow Along.',
      image: {
        url: 'https://www.followalong.net/img/favicon.ico'
      }
    })
    this.saveAddonForIdentity(identity, {
      type: 'FollowAlongFree'
    })
    this.addSignalToIdentity(identity, {
      title: 'Home',
      description: 'Sorting all entries by most recent',
      permalink: 'home',
      order: 0,
      icon: `
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="h-5 w-5 flex-shrink-0 text-gray-300 mr-3"
        >
          <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
          <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
        </svg>
      `
    })
    this.addSignalToIdentity(identity, {
      title: 'Watch',
      description: 'Entries that have videos',
      permalink: 'watch',
      order: 1,
      icon: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5 flex-shrink-0 text-gray-300 mr-3">
          <path d="M3.25 4A2.25 2.25 0 001 6.25v7.5A2.25 2.25 0 003.25 16h7.5A2.25 2.25 0 0013 13.75v-7.5A2.25 2.25 0 0010.75 4h-7.5zM19 4.75a.75.75 0 00-1.28-.53l-3 3a.75.75 0 00-.22.53v4.5c0 .199.079.39.22.53l3 3a.75.75 0 001.28-.53V4.75z" />
        </svg>
      `,
      filter: `
        (queries) => {
          return (entry) => {
            return queries.videoForEntry(entry)
          }
        }
      `.trim()
    })
    this.addSignalToIdentity(identity, {
      title: 'Listen',
      description: 'Entries that have audio',
      permalink: 'listen',
      order: 2,
      icon: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5 flex-shrink-0 text-gray-300 mr-3">
          <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
          <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
        </svg>
      `,
      filter: `
        (queries) => {
          return (entry) => {
            return queries.audioForEntry(entry)
          }
        }
      `.trim()
    })
    this.addSignalToIdentity(identity, {
      title: 'Read',
      description: 'Entries that have reading content',
      permalink: 'read',
      order: 3,
      icon: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5 flex-shrink-0 text-gray-300 mr-3">
          <path d="M10.75 16.82A7.462 7.462 0 0115 15.5c.71 0 1.396.098 2.046.282A.75.75 0 0018 15.06v-11a.75.75 0 00-.546-.721A9.006 9.006 0 0015 3a8.963 8.963 0 00-4.25 1.065V16.82zM9.25 4.065A8.963 8.963 0 005 3c-.85 0-1.673.118-2.454.339A.75.75 0 002 4.06v11a.75.75 0 00.954.721A7.506 7.506 0 015 15.5c1.579 0 3.042.487 4.25 1.32V4.065z" />
        </svg>
      `,
      filter: `
        (queries) => {
          return (entry) => {
            return !queries.videoForEntry(entry) &&
              !queries.audioForEntry(entry)
          }
        }
      `.trim()
    })
    this.addSignalToIdentity(identity, {
      title: 'Done',
      description: 'Entries that have recently been marked as done',
      permalink: 'done',
      order: 4,
      icon: `
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="h-5 w-5 flex-shrink-0 text-gray-300 mr-3"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clip-rule="evenodd"
          />
        </svg>
      `,
      filter: `
        (queries) => {
          return (entry) => {
            return !!entry.readAt
          }
        }
      `.trim(),
      sort: `
        (queries) => {
          return (a, b) => {
            if (a.readAt < b.readAt) return 1
            if (a.readAt > b.readAt) return -1
            return 0
          }
        }
      `.trim()
    })
  }

  addFeedToIdentity (identity, url, data, entries = []) {
    this.track(identity, 'feeds', null, 'create', { url, data })

    if (url === CHANGELOG_URL) {
      entries.unshift({
        id: 'about',
        title: 'Twitter is done. Long live RSS.',
        published: new Date().toISOString(),
        content: `
        <p>
          It's not <em>just</em> Twitter. It's all the rest of the them as well!
        </p>

        <p>
          If you're not tech-savvy, Follow Along is a place where you can follow the people and communities that you care about.
          The underlying technology of Follow Along (RSS feeds) has been around for <em>decades</em>, so a large chunk of the internet is already here – calendars, blogs, bizapps, and some traditional social media too!
        </p>

        <p>
          If you're interested in the tech specs, Follow Along is a 100%-client-side PWA that fetches RSS feeds for you.
          We don't track <em>anything</em> about you or the feeds you follow.
          Have a look at our <a href="https://github.com/followalong/www.followalong.com">open source code</a> (and host it yourself!)
        </p>

        <p>
          Finally, we have big plans that are laid out in <a href="https://changelog.followalong.com/2022/12/23/the-path-to-v3">The Path to V3 in 2023</a>.
          We'd ❤️ to have you follow along for the ride!
        </p>

        <p>
          Cheers!
        </p>
        `.trim()
      })
    }

    const feed = this.queries.latestFeedForIdentity(identity)
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

        entries.forEach((e) => this.upsertEntryForIdentity(identity, feed, e))
      })
  }

  upsertFeedForIdentity (identity, feed, data) {
    if (this.queries.feedChanged(feed, data)) {
      this.track(identity, 'feeds', feed.id, 'update', { data })
    }
  }

  upsertEntryForIdentity (identity, feed, data) {
    const key = this.queries.keyForEntry({ data })
    const found = this.queries.entryForFeedForIdentity(identity, feed, key)

    if (!found) {
      this.track(identity, 'entries', null, 'create', { feedId: feed.id, data })
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
    return new Promise((resolve, reject) => {
      this.state.deleteDB(identity.id)

      if (!this.queries.allIdentities().length) {
        this.addIdentity({})
      }

      resolve(this.queries.allIdentities()[0])
    })
  }

  markEntryAsReadForIdentity (identity, entry) {
    this.track(identity, 'entries', entry.id, 'read')
  }

  markEntryAsUnreadForIdentity (identity, entry) {
    this.track(identity, 'entries', entry.id, 'unread')
  }

  showNewEntries () {
    this.queries.lastBackgroundFetch = Date.now()
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
        entries: this.queries.entriesForIdentity(identity),
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
