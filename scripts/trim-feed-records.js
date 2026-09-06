// Paste into the console on www.followalong.com.
//
// A feed's record is its title, its icon and the validators for the next poll,
// about a kilobyte. Two things got stored in one that never belonged there:
// the feed's own articles, and — when the address followed was a site rather
// than its feed — an entire parsed web page.
//
// A feed sheds these when it is next polled, which for one in backoff is a day
// away and for a paused one is never. Writing the trimmed record here does the
// same thing a poll would, and supersedes the fat event on disk.
//
// Nothing is lost that the app reads: articles are their own collection, and a
// parsed page was never readable as a feed. Safe to run twice.
(function () {
  var app = window.followAlong

  if (!app) {
    console.error('Open the app first, then run this again.')
    return
  }

  var DROPPED = { item: true, entry: true, html: true }

  var queries = app.queries
  var commands = app.commands
  var identity = queries.allIdentities()[0]

  var sizeOf = function (value) {
    return JSON.stringify(value === undefined ? '' : value).length
  }

  var trim = function (data) {
    if (!data || typeof data !== 'object') {
      return data
    }

    if (Array.isArray(data)) {
      return data.map(trim)
    }

    var kept = {}

    Object.keys(data).forEach(function (key) {
      if (!DROPPED[key]) {
        kept[key] = trim(data[key])
      }
    })

    return kept
  }

  var before = queries.eventsToFile(identity).length

  var fat = queries.feedsForIdentity(identity).filter(function (feed) {
    return sizeOf(feed.data) > sizeOf(trim(feed.data))
  })

  console.log('feeds keeping more than they should:', fat.length)

  if (!fat.length) {
    console.log('nothing to do -', before.toLocaleString(), 'bytes')
    return
  }

  fat.forEach(function (feed) {
    var was = sizeOf(feed.data)

    commands.track(identity, 'feeds', feed.id, 'update', { data: trim(feed.data) })

    var now = sizeOf(queries.feedForIdentity(identity, feed.id).data)

    console.log('  ' + was.toLocaleString() + 'B -> ' + now.toLocaleString() + 'B  ' + queries.titleForFeed(feed))
  })

  var after = queries.eventsToFile(identity).length

  console.log('log', before.toLocaleString(), '->', after.toLocaleString(), 'bytes')
  console.log('the bucket is written a second or two after this, on its own.')
})()
