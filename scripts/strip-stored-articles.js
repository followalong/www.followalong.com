// Paste into the console on www.followalong.com.
//
// A feed record written before articles were kept out of it still carries
// them, and a feed only sheds them when it is next polled. One in backoff can
// wait a day for that, and a paused one waits for good. This writes the lean
// record itself, which supersedes the fat one exactly as a poll would.
//
// Safe to run twice: the second run finds nothing to do.
(function () {
  var app = window.followAlong

  if (!app) {
    console.error('Open the app first, then run this again.')
    return
  }

  var queries = app.queries
  var commands = app.commands

  if (typeof commands.carriesItems !== 'function') {
    console.error('This build is older than the fix. Reload the app and try again.')
    return
  }

  var identity = queries.allIdentities()[0]
  var before = queries.eventsToFile(identity).length

  var fat = queries.feedsForIdentity(identity).filter(function (feed) {
    return commands.carriesItems(feed.data)
  })

  console.log('feeds still carrying their articles:', fat.length)

  if (!fat.length) {
    console.log('nothing to do -', before.toLocaleString(), 'bytes')
    return
  }

  fat.forEach(function (feed) {
    var was = JSON.stringify(feed.data || '').length

    commands.track(identity, 'feeds', feed.id, 'update', {
      data: commands.withoutItems(feed.data)
    })

    console.log('  ' + was.toLocaleString() + 'B ->', JSON.stringify(queries.feedForIdentity(identity, feed.id).data || '').length.toLocaleString() + 'B', queries.titleForFeed(feed))
  })

  var after = queries.eventsToFile(identity).length

  console.log('log', before.toLocaleString(), '->', after.toLocaleString(), 'bytes')
  console.log('the bucket is written a second or two after this, on its own.')
})()
