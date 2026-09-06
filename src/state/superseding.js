// Actions where only the latest occurrence means anything. Tracking one drops
// every earlier event of the same action on the same object, from memory and
// from disk, so the log records a state rather than a history of polling.
//
// Its own module because runners.js imports the event store and the event
// store needs this — putting it in either one makes a cycle, and the list
// then reads as undefined at the moment it is needed.
// markRead and markUnread are separate actions and supersede separately, so
// the log keeps the latest of each and the fold still replays them in time
// order to the right answer. The same for saving.
const SUPERSEDING = [
  'feeds.fetched',
  'feeds.fetchFailed',
  'feeds.skippedEntries',
  'entries.markRead',
  'entries.markUnread',
  'entries.save',
  'entries.unsave'
]

export default SUPERSEDING

export { SUPERSEDING }
