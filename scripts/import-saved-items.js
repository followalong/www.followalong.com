// Paste this into the console on www.followalong.com to bring back what you
// saved on the old followalong.net app.
//
// It takes the one thing out of that export that cannot be fetched again: the
// saves. The feeds are still followed here and what was read will be read
// again, so bringing either across would replace this device's newer answer
// with an older one.
//
// It merges. An entry already here is saved in place rather than duplicated,
// and a save already here is left alone, so running it twice does nothing the
// second time.

(function () {
  // Event keys parse the object id as [\w-:]+, so anything else has to go.
  var safeId = function (id) { return String(id).replace(/[^\w:-]/g, '-') }

  var num = function (value) {
    var n = typeof value === 'string' ? Date.parse(value) : Number(value)

    return isFinite(n) ? Math.floor(n) : 0
  }

  var textOf = function (value) {
    if (typeof value === 'string') return value
    if (value && typeof value === 'object') return value['#text'] || value['@_href'] || value.href || value.url

    return null
  }

  // An RSS <guid> carrying attributes parses to an object, so keyForEntry
  // skips it and settles on the link. Matching on the single key it happens to
  // choose misses entries the old app knew by their guid, so index them all.
  var identifiersForEntry = function (entry) {
    var data = (entry && entry.data) || {}

    return [data.id, textOf(data.guid), textOf(data.link), textOf(data.url)]
      .filter(function (key) { return typeof key === 'string' && key.length })
  }

  var identifiersForItem = function (item) {
    return [item.guid, item.link, item.id && ('imported:' + item.id)]
      .filter(function (key) { return typeof key === 'string' && key.length })
  }

  var entryDataFor = function (item) {
    var data = {
      // Mirrors what keyForEntry reads, with a fallback so it can never throw.
      id: item.guid || item.link || ('imported:' + item.id),
      guid: item.guid,
      title: item.title,
      pubDate: item.pubDate,
      description: item.content,
      link: item.link,
      author: item.author
    }

    if (item.enclosure) data.enclosure = item.enclosure
    if (item['media:player']) data['media:player'] = item['media:player']
    if (item.itunes) data.itunes = item.itunes
    else if (item.image && item.image.url) data.itunes = { image: item.image.url }

    return data
  }

  var isOldIdentity = function (data) {
    return !!data && Array.isArray(data.feeds) && Array.isArray(data.items)
  }

  // The file is either one identity or the whole export, which wraps a list of
  // them. Both are worth accepting: nobody picking a file has a reason to know
  // which one the old app wrote.
  var identitiesIn = function (data) {
    if (isOldIdentity(data)) return [data]
    if (data && Array.isArray(data.identities)) return data.identities.filter(isOldIdentity)

    return []
  }

  // A saved entry keeps its source, so a feed no longer followed here is added
  // back — paused, because bringing a save across is not a decision to start
  // reading that feed again. A feed the old file never named leaves the entry
  // pointing at an id nothing answers to, which reads as a save with no source
  // rather than as an error.
  var feedFor = function (app, item, feedsByUrl, feedIdByUrl, report, floor) {
    if (feedIdByUrl.has(item.feedUrl)) return feedIdByUrl.get(item.feedUrl)

    var feed = feedsByUrl.get(item.feedUrl)

    if (!feed) return safeId(item.feedUrl || 'unknown-feed')

    var objectId = safeId(feed.id)

    app.commands.track(app.identity, 'feeds', objectId, 'create', { url: feed.url, data: { title: feed.name } }, floor + 1)
    app.commands.track(app.identity, 'feeds', objectId, 'pause', {}, floor + 2)

    feedIdByUrl.set(feed.url, objectId)
    report.feeds++

    return objectId
  }

  var importSavedItems = function (app, data) {
    var identities = identitiesIn(data)

    if (!identities.length) {
      throw new Error('That does not look like a Follow Along identity file.')
    }

    var identity = app.identity
    var queries = app.queries
    var commands = app.commands
    var report = { saved: 0, matched: 0, created: 0, feeds: 0, alreadySaved: 0 }
    // Replay sorts by time, so anything appended has to be stamped after every
    // event already here or it folds before the event that introduces what it
    // refers to and is dropped. A rolled-up identity is the case that bites:
    // its whole log is one event stamped when the roll up ran, which is later
    // than any savedAt an older export can carry.
    var floor = queries.findAllEvents(identity).reduce(function (latest, event) {
      return Math.max(latest, event.time || 0)
    }, 0)
    var feedIdByUrl = new Map()
    var byIdentifier = new Map()

    queries.feedsForIdentity(identity).forEach(function (feed) {
      var url = queries.urlForFeed(feed)

      if (url && !feedIdByUrl.has(url)) feedIdByUrl.set(url, feed.id)
    })

    queries.entriesForIdentity(identity).forEach(function (entry) {
      identifiersForEntry(entry).forEach(function (key) {
        if (!byIdentifier.has(key)) byIdentifier.set(key, entry)
      })
    })

    identities.forEach(function (old) {
      var feedsByUrl = new Map()

      old.feeds.forEach(function (feed) {
        if (feed.url && !feedsByUrl.has(feed.url)) feedsByUrl.set(feed.url, feed)
      })

      old.items.forEach(function (item) {
        if (!item.savedAt) return

        var entry = identifiersForItem(item).map(function (key) { return byIdentifier.get(key) }).find(function (e) { return e })
        var createdAt

        if (entry) {
          report.matched++
          createdAt = entry.createdAt || 0
        } else {
          createdAt = floor + 3

          var objectId = safeId(item.id)

          commands.track(identity, 'entries', objectId, 'create', {
            feedId: feedFor(app, item, feedsByUrl, feedIdByUrl, report, floor),
            data: entryDataFor(item)
          }, createdAt)
          report.created++

          entry = queries.entryForIdentity(identity, objectId)

          if (entry) {
            identifiersForEntry(entry).forEach(function (key) {
              if (!byIdentifier.has(key)) byIdentifier.set(key, entry)
            })
          }
        }

        if (!entry) return

        if (queries.isEntrySaved(entry)) {
          report.alreadySaved++
          return
        }

        // The original savedAt is kept when it already sorts after everything
        // here, because it is the truer answer; otherwise it gives way to the
        // only thing that matters, which is landing after the create.
        commands.track(identity, 'entries', entry.id, 'save', {}, Math.max(num(item.savedAt), createdAt + 1, floor + 4))
        report.saved++
      })
    })

    // Identities made before saving existed have no Saved signal, so there
    // would be nowhere on screen to see any of this.
    if (report.saved && commands.ensureSavedSignalForIdentity) {
      commands.ensureSavedSignalForIdentity(identity)
    }

    return report
  }

  if (typeof window !== 'undefined') {
    window.importFollowAlongSaved = importSavedItems
  }

  // Everything above is the work. The rest is only how the file gets here.
  if (typeof document === 'undefined' || !document.querySelector) return

  // The app puts itself here on boot; the Vue internals are the fallback for a
  // build old enough to predate that.
  var mount = document.querySelector('#app')
  var vue = mount && mount.__vue_app__
  var app = window.followAlong || (vue && vue._instance && vue._instance.proxy)

  if (!app || !app.commands || !app.identity) {
    console.error('Run this on www.followalong.com, once an identity has loaded.')
    return
  }

  var input = document.createElement('input')

  input.type = 'file'
  input.accept = 'application/json,.json'

  input.onchange = function () {
    var file = input.files && input.files[0]

    if (!file) return

    file.text().then(function (text) {
      var report = importSavedItems(app, JSON.parse(text))

      console.log(
        'Brought back ' + report.saved + ' saved item(s): ' +
        report.matched + ' already here, ' + report.created + ' added, ' +
        report.alreadySaved + ' already saved, ' + report.feeds + ' feed(s) restored paused.'
      )
      console.log('Open Saved to check, then give it a moment to back up.')
    }).catch(function (e) {
      console.error(e.message)
    })
  }

  input.click()
  console.log('Pick the file the old app’s Download Identity button wrote.')
})()
