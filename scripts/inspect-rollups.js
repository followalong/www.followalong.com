// Paste into the console on www.followalong.com. Reads only; writes nothing.
//
// A rollup is a snapshot of everything, written when a log was compacted. It
// is never superseded and never dropped, so it stays at whatever size it was
// for good. What decides whether it is worth retiring is how much of it is
// only in there: an object the log also holds a create for is being carried
// twice, and the rollup is paying for it.
(function () {
  var app = window.followAlong

  if (!app) {
    console.error('Open the app first, then run this again.')
    return
  }

  var queries = app.queries
  var identity = queries.allIdentities()[0]
  var events = queries.findAllEvents(identity)

  var sizeOf = function (value) {
    return JSON.stringify(value === undefined ? '' : value).length
  }

  var rollups = events.filter(function (event) {
    return event.action === 'rollup'
  })

  if (!rollups.length) {
    console.log('no rollups in this log')
    return
  }

  var created = {}

  events.forEach(function (event) {
    if (event.action === 'create') {
      created[event.collection + '/' + event.objectId] = true
    }
  })

  var total = 0
  var onlyHere = 0
  var onlyBytes = 0
  var alsoBytes = 0

  rollups.forEach(function (event) {
    var data = event.data || {}

    console.log('--- rollup', new Date(event.time).toISOString(), sizeOf(data).toLocaleString() + 'B')

    ;['feeds', 'entries', 'signals', 'addons'].forEach(function (collection) {
      var list = data[collection] || []
      var missing = list.filter(function (object) {
        return !created[collection + '/' + object.id]
      })

      total += list.length
      onlyHere += missing.length
      onlyBytes += missing.reduce(function (sum, object) { return sum + sizeOf(object) }, 0)
      alsoBytes += list.reduce(function (sum, object) { return sum + sizeOf(object) }, 0) -
        missing.reduce(function (sum, object) { return sum + sizeOf(object) }, 0)

      console.log('    ' + collection + ':', list.length, 'of which', missing.length, 'are only here')
    })
  })

  console.log('')
  console.log('objects in rollups:', total)
  console.log('  also held as a create elsewhere:', total - onlyHere, '-', alsoBytes.toLocaleString() + 'B carried twice')
  console.log('  only in a rollup:', onlyHere, '-', onlyBytes.toLocaleString() + 'B that would have to be written out')
  console.log('')
  console.log('retiring the rollups would cost about', onlyBytes.toLocaleString(),
    'bytes of new creates and reclaim', rollups.reduce(function (sum, e) { return sum + sizeOf(e.data) }, 0).toLocaleString(), 'bytes.')
})()
