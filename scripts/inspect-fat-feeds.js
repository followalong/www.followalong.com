// Paste into the console on www.followalong.com. Reads only; writes nothing.
//
// Says which feeds keep the most in their own record, and what inside them is
// taking the room. A feed record is meant to be a title, an icon and the
// validators for the next poll; anything much over a kilobyte is a question.
(function () {
  var app = window.followAlong

  if (!app) {
    console.error('Open the app first, then run this again.')
    return
  }

  var queries = app.queries
  var identity = queries.allIdentities()[0]

  var sizeOf = function (value) {
    return JSON.stringify(value === undefined ? '' : value).length
  }

  var biggest = queries.feedsForIdentity(identity).map(function (feed) {
    return { feed: feed, bytes: sizeOf(feed.data) }
  }).sort(function (a, b) {
    return b.bytes - a.bytes
  }).slice(0, 5)

  biggest.forEach(function (row) {
    var feed = row.feed
    var data = feed.data || {}

    console.log('---', row.bytes.toLocaleString() + 'B', queries.titleForFeed(feed))
    console.log('    ', queries.urlForFeed(feed))

    Object.keys(data).map(function (key) {
      return { key: key, bytes: sizeOf(data[key]) }
    }).sort(function (a, b) {
      return b.bytes - a.bytes
    }).slice(0, 6).forEach(function (field) {
      var value = data[field.key]
      var shape = Array.isArray(value) ? 'array of ' + value.length : typeof value

      console.log('     ' + field.bytes.toLocaleString() + 'B  ' + field.key + '  (' + shape + ')')
    })
  })
})()
