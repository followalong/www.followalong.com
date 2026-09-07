import EventStore from './event-store'
import EventStoreEvent from './event-store-event.js'
import VERSION from './version.js'

// State that changes over time is recorded as a timestamp rather than a
// boolean, so every such transition is the same runner with a different field.
const TIMESTAMP = (attr) => (store, event) => {
  const existing = store.findByIdWithDeleted(event.collection, event.objectId)

  if (!existing) {
    return console.warn(`Object not found for event: ${JSON.stringify(event)}`)
  }

  existing[attr] = event.time
}

const UNTIMESTAMP = (attr) => (store, event) => {
  const existing = store.findByIdWithDeleted(event.collection, event.objectId)

  if (!existing) {
    return console.warn(`Object not found for event: ${JSON.stringify(event)}`)
  }

  delete existing[attr]
}

// A decision a reader made at a moment, where the moment decides and not the
// order the log happens to be folded in. A rollup folds ahead of everything
// and a merge brings events written before the snapshot they land on, so an
// event that arrives late is not thereby the newest thing to have happened.
//
// Each of a pair records when it was decided - saved or unsaved, read or
// unread - so the fold can tell which came last from the events themselves
// and reaches the same answer whatever order it sees them in.
const DECIDED = (attr, insteadOf) => (store, event) => {
  const existing = store.findByIdWithDeleted(event.collection, event.objectId)

  if (!existing) {
    return console.warn(`Object not found for event: ${JSON.stringify(event)}`)
  }

  // Events written before this carry no moment of their own. When they were
  // tracked is the best answer they have, and it is the answer the fold gave
  // all of them until now, so nothing already stored changes meaning.
  const at = (event.data || {}).at || event.time

  if (at <= (existing[attr] || 0) || at <= (existing[insteadOf] || 0)) {
    return
  }

  existing[attr] = at

  delete existing[insteadOf]
}

// A poll records what the feed answered with, so the next one can ask
// conditionally. Absent validators are cleared rather than kept: a feed that
// stops sending an ETag must not be asked with a stale one forever.
const FETCHED = (store, event) => {
  const existing = store.findByIdWithDeleted(event.collection, event.objectId)

  if (!existing) {
    return console.warn(`Object not found for event: ${JSON.stringify(event)}`)
  }

  const { etag, lastModified } = event.data || {}

  existing.updatedAt = event.time
  existing.etag = etag
  existing.lastModified = lastModified

  delete existing.failedAt
  delete existing.failureCount
  delete existing.failureStatus
}

// The count rides in the event rather than being incremented here, because
// this action supersedes: every earlier failure is dropped from the log, so
// an incrementing runner would replay every time as the first failure.
const FETCH_FAILED = (store, event) => {
  const existing = store.findByIdWithDeleted(event.collection, event.objectId)

  if (!existing) {
    return console.warn(`Object not found for event: ${JSON.stringify(event)}`)
  }

  const { count, status, reason } = event.data || {}

  existing.failedAt = event.time
  existing.failureCount = count
  existing.failureStatus = status
  existing.failureReason = reason
}

// Items the last body carried that we could not store. The count rides in the
// event rather than being counted here, because this action supersedes and a
// runner that incremented would replay every time as the first one.
const SKIPPED_ENTRIES = (store, event) => {
  const existing = store.findByIdWithDeleted(event.collection, event.objectId)

  if (!existing) {
    return console.warn(`Object not found for event: ${JSON.stringify(event)}`)
  }

  existing.skippedEntries = (event.data || {}).count || 0
}

// Hints are dismissed one at a time and never come back, so the event only
// has to append.
const PUSH = (attr) => (store, event) => {
  const existing = store[event.collection].find((item) => item.id === event.objectId)

  if (!existing) {
    return console.warn(`Object not found for event: ${JSON.stringify(event)}`)
  }

  const value = (event.data || {}).hint

  existing[attr] = existing[attr] || []

  if (existing[attr].indexOf(value) === -1) {
    existing[attr].push(value)
  }
}

const ROLLUP = (store, event) => {
  // The one event that folds into every collection. Its own collection is
  // identities, so nothing else would tell a reader its entries had moved.
  store.bumpEveryRevision()

  const data = event.data || {}

  // A rollup can be empty - one written to stand in for others carries no
  // objects at all - and an empty one has nothing to say rather than
  // something to crash over.
  const identities = data.identity ? [data.identity] : []
  identities.forEach((identity) => {
    const identityEvent = new EventStoreEvent('identities', identity.id, 'create', identity, identity.createdAt, event.version)

    EventStore.RUNNERS.CREATE(store, identityEvent)
  })

  const feeds = data.feeds || []
  feeds.forEach((feed) => {
    const feedEvent = new EventStoreEvent('feeds', feed.id, 'create', feed, feed.createdAt, event.version)

    EventStore.RUNNERS.CREATE(store, feedEvent)
  })

  const entries = data.entries || []
  entries.forEach((entry) => {
    const entryEvent = new EventStoreEvent('entries', entry.id, 'create', entry, entry.createdAt, event.version)

    EventStore.RUNNERS.CREATE(store, entryEvent)
  })

  const signals = data.signals || []
  signals.forEach((signal) => {
    const signalEvent = new EventStoreEvent('signals', signal.id, 'create', signal, signal.createdAt, event.version)

    EventStore.RUNNERS.CREATE(store, signalEvent)
  })

  const addons = data.addons || []
  addons.forEach((addon) => {
    const addonEvent = new EventStoreEvent('addons', addon.id, 'configure', addon, addon.updatedAt, event.version)

    EventStore.RUNNERS.UPDATE(store, addonEvent)
  })
}

export default {
  'feeds.create': EventStore.RUNNERS.CREATE, // TODO: We can't use nested func because URL is outside of data; OK because URL is immutable for now
  'feeds.update': EventStore.RUNNERS.UPDATE,
  'feeds.delete': EventStore.RUNNERS.DELETE,
  'feeds.fetched': FETCHED,
  'feeds.fetchFailed': FETCH_FAILED,
  'feeds.skippedEntries': SKIPPED_ENTRIES,
  // Forgiving a failure without claiming a fetch: the feed keeps its
  // validators, its last-polled time and its failure count, so it is polled
  // once more and, if it fails again, resumes the backoff it had earned.
  'feeds.clearFailure': UNTIMESTAMP('failedAt'),
  'feeds.pause': TIMESTAMP('pausedAt'),
  'feeds.unpause': UNTIMESTAMP('pausedAt'),
  'entries.create': EventStore.RUNNERS.CREATE, // TODO: We can't use nested func because feedId is outside of data; OK because feedId is immutable for now
  'entries.update': EventStore.RUNNERS.UPDATE,
  'entries.delete': EventStore.RUNNERS.DELETE,
  'entries.save': DECIDED('savedAt', 'unsavedAt'),
  'entries.unsave': DECIDED('unsavedAt', 'savedAt'),
  'entries.markRead': TIMESTAMP('readAt'),
  'entries.markUnread': UNTIMESTAMP('readAt'),
  // Action names used before v2.3. Events already on disk still carry them.
  'entries.read': TIMESTAMP('readAt'),
  'entries.unread': UNTIMESTAMP('readAt'),
  'identities.create': EventStore.RUNNERS.CREATE,
  'identities.update': EventStore.RUNNERS.UPDATE,
  'identities.hideHint': PUSH('hints'),
  'identities.delete': EventStore.RUNNERS.DELETE,
  'identities.rollup': ROLLUP,
  'signals.create': EventStore.RUNNERS.CREATE,
  'signals.update': EventStore.RUNNERS.UPDATE,
  'signals.delete': EventStore.RUNNERS.DELETE,
  'addons.configure': EventStore.RUNNERS.UPDATE,
  'addons.delete': EventStore.RUNNERS.DELETE,
  'v2.1': {
    'identities.setProxy': (store, event) => {
      const addonEvent = new EventStoreEvent('addons', event.data.addonType, 'configure', event.data.data, event.time, VERSION)

      store.bumpEveryRevision()

      EventStore.RUNNERS.UPDATE(store, addonEvent)
    },
    'identities.rollup': (store, event) => {
      const addons = []

      for (const key in event.data.identity.addons) {
        event.data.identity.addons[key].id = key
        addons.push(event.data.identity.addons[key])
      }

      delete event.data.identity.addons

      event.data.addons = addons

      const rollupEvent = new EventStoreEvent(event.collection, event.objectId, event.action, event.data, event.time, VERSION)
      ROLLUP(store, rollupEvent)
    }
  }
}
