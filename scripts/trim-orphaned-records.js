// Paste into the console on www.followalong.com.
//
// Unfollowing a feed does not shrink the log. A delete is a tombstone: the
// object stops being read, and every event that carried its data stays where
// it is. So a feed that had stored something it never should have — a whole
// parsed web page, say — keeps it after the feed is gone, and the ordinary
// trim cannot reach it, because that walks the feeds you still follow.
//
// This walks the events instead. Only a superseding action can be reclaimed:
// writing a newer one drops the older from disk here and, through the fold,
// on every other device too. Nothing else can shrink a log that is merged as
// a union, since anything simply deleted comes back from the next device to
// sync. What cannot be reclaimed is reported rather than quietly left.
//
// Safe to run twice: the second run finds nothing to do.
(function () {
  var app = window.followAlong

  if (!app) {
    console.error('Open the app first, then run this again.')
    return
  }

  var BIG = 4096
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
  var events = queries.findAllEvents(identity)

  var fat = events.filter(function (event) {
    return event.collection === 'feeds' &&
      event.action === 'update' &&
      sizeOf(event.data) > BIG
  })

  var stuck = events.filter(function (event) {
    return event.action === 'create' && sizeOf(event.data) > BIG
  })

  console.log('oversized feed records that can be replaced:', fat.length)

  fat.forEach(function (event) {
    var was = sizeOf(event.data)
    var lean = trim((event.data || {}).data)

    commands.track(identity, 'feeds', event.objectId, 'update', { data: lean })

    console.log('  ' + was.toLocaleString() + 'B -> ' + sizeOf({ data: lean }).toLocaleString() + 'B  ' + event.objectId)
  })

  var after = queries.eventsToFile(identity).length

  console.log('log', before.toLocaleString(), '->', after.toLocaleString(), 'bytes')

  if (stuck.length) {
    console.log('')
    console.log('cannot be reclaimed:', stuck.length, 'create events over ' + BIG + 'B,',
      stuck.reduce(function (sum, e) { return sum + sizeOf(e.data) }, 0).toLocaleString() + 'B in total.')
    console.log('A create is not superseded by anything, and dropping it here would')
    console.log('only bring it back from the next device that syncs.')
  }
})()
