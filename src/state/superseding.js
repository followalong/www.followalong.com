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
  // Every one carries the whole feed document, so the one before it decides
  // nothing the latest does not decide again. Only upsertFeedForIdentity
  // writes these, and it always writes the complete record.
  'feeds.update',
  'feeds.fetched',
  'feeds.fetchFailed',
  'feeds.skippedEntries',
  // The whole entry, every time, so the edit before it decides nothing the
  // latest does not decide again. A feed that rewrites a post keeps one record
  // of what it now says rather than one of every wording it ever had.
  'entries.update',
  'entries.markRead',
  'entries.markUnread',
  'entries.save',
  'entries.unsave'
]

export default SUPERSEDING

export { SUPERSEDING }
