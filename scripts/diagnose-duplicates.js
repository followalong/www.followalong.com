// Paste into the console on www.followalong.com. Reads only; writes nothing.
(function () {
  var app = window.followAlong

  if (!app) {
    console.error('Open the app first, then run this again.')
    return
  }

  var queries = app.queries
  var identity = queries.allIdentities()[0]
  var feeds = queries.feedsForIdentity(identity)
  var events = queries.findAllEvents(identity)
  var file = queries.eventsToFile(identity)

  var push = function (bucket, key, value) {
    bucket[key] = bucket[key] || []
    bucket[key].push(value)
    return bucket
  }

  var keyOf = function (entry) {
    try {
      return queries.keyForEntry(entry)
    } catch (e) {
      return null
    }
  }

  console.log('--- the log')
  console.log('feeds', feeds.length, 'events', events.length, 'bytes', file.length.toLocaleString())

  var byAction = {}

  events.forEach(function (event) {
    var name = event.collection + '.' + event.action
    byAction[name] = (byAction[name] || 0) + 1
  })

  console.log('--- events by action')
  console.table(byAction)

  console.log('--- biggest events')

  events.map(function (event) {
    return { key: event.key, bytes: (event.toLocal() || '').length }
  }).sort(function (a, b) {
    return b.bytes - a.bytes
  }).slice(0, 5).forEach(function (event) {
    console.log(event.bytes.toLocaleString(), event.key)
  })

  var feedsByUrl = {}

  feeds.forEach(function (feed) {
    push(feedsByUrl, queries.urlForFeed(feed) || '(none)', feed.id)
  })

  var sameUrl = Object.keys(feedsByUrl).filter(function (url) {
    return feedsByUrl[url].length > 1
  })

  console.log('--- feeds sharing one url:', sameUrl.length)

  sameUrl.slice(0, 5).forEach(function (url) {
    console.log(feedsByUrl[url].length + 'x', url)
  })

  var entries = queries.entriesForIdentity(identity)
  var byKey = {}
  var unkeyable = 0

  entries.forEach(function (entry) {
    var key = keyOf(entry)

    if (key === null) {
      unkeyable++
      return
    }

    push(byKey, entry.feedId + ' ' + key, entry)
  })

  var storedTwice = Object.keys(byKey).filter(function (id) {
    return byKey[id].length > 1
  })

  console.log('--- entries', entries.length)
  console.log('same feed and same key, stored more than once:', storedTwice.length)
  console.log('entries no key can be derived for:', unkeyable)

  storedTwice.slice(0, 5).forEach(function (id) {
    var list = byKey[id]

    console.log(list.length + 'x', queries.titleForEntry(list[0]), '| ids', list.map(function (entry) {
      return entry.id
    }).join(', '))
  })

  var byTitle = {}

  entries.forEach(function (entry) {
    var title = (queries.titleForEntry(entry) || '').trim()

    if (title) {
      push(byTitle, title, entry)
    }
  })

  var sameTitle = Object.keys(byTitle).filter(function (title) {
    return byTitle[title].length > 1
  })

  console.log('--- same title, different key:', sameTitle.length)

  sameTitle.slice(0, 5).forEach(function (title) {
    var list = byTitle[title]

    console.log(list.length + 'x', title)

    list.slice(0, 3).forEach(function (entry) {
      console.log('    feed', entry.feedId, 'key', keyOf(entry))
    })
  })
})()
