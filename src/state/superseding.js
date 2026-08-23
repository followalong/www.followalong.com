// Actions where only the latest occurrence means anything. Tracking one drops
// every earlier event of the same action on the same object, from memory and
// from disk, so the log records a state rather than a history of polling.
//
// Its own module because runners.js imports the event store and the event
// store needs this — putting it in either one makes a cycle, and the list
// then reads as undefined at the moment it is needed.
const SUPERSEDING = ['feeds.fetched']

export default SUPERSEDING

export { SUPERSEDING }
