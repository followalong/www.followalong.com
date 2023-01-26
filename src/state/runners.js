import EventStore from './event-store'
import EventStoreEvent from './event-store-event.js'

const EVENT_WITH_POSSIBLE_NESTED_DATA = (type) => {
  return (store, event) => {
    if (!event.data || !event.data.data) {
      return EventStore.RUNNERS[type](store, event)
    }

    const data = event.data && event.data.data ? event.data.data : event.data
    const newEvent = new EventStoreEvent(event.collection, event.objectId, event.action, data, event.time, event.version)

    return EventStore.RUNNERS[type](store, newEvent)
  }
}

export default {
  'feeds.create': EventStore.RUNNERS.CREATE, // TODO: We can't use nested func because URL is outside of data; OK because URL is immutable for now
  'feeds.update': EVENT_WITH_POSSIBLE_NESTED_DATA('UPDATE'),
  'feeds.delete': EventStore.RUNNERS.DELETE,
  'feeds.pause': (store, event) => {
    const collection = store[event.collection]
    const existing = collection.find((item) => item.id === event.objectId)

    if (!existing) {
      console.warn(`Object not found for event: ${JSON.stringify(event)}`)
      return
    }

    existing.pausedAt = event.time
  },
  'feeds.unpause': (store, event) => {
    const collection = store[event.collection]
    const existing = collection.find((item) => item.id === event.objectId)

    if (!existing) {
      console.warn(`Object not found for event: ${JSON.stringify(event)}`)
      return
    }

    delete existing.pausedAt
  },
  'entries.create': EventStore.RUNNERS.CREATE, // TODO: We can't use nested func because feedId is outside of data; OK because feedId is immutable for now
  'entries.update': EVENT_WITH_POSSIBLE_NESTED_DATA('UPDATE'),
  'entries.delete': EventStore.RUNNERS.DELETE,
  'entries.read': (store, event) => {
    const collection = store[event.collection]
    const existing = collection.find((item) => item.id === event.objectId)

    if (!existing) {
      console.warn(`Object not found for event: ${JSON.stringify(event)}`)
      return
    }

    existing.readAt = event.time
  },
  'entries.unread': (store, event) => {
    const collection = store[event.collection]
    const existing = collection.find((item) => item.id === event.objectId)

    if (!existing) {
      console.warn(`Object not found for event: ${JSON.stringify(event)}`)
      return
    }

    delete existing.readAt
  },
  'identities.create': EventStore.RUNNERS.CREATE,
  'identities.delete': EventStore.RUNNERS.DELETE,
  'identities.setProxy': (store, event) => {
    const collection = store[event.collection]
    const existing = collection.find((item) => item.id === event.objectId)

    if (!existing) {
      console.warn(`Object not found for event: ${JSON.stringify(event)}`)
      return
    }

    existing.addons = existing.addons || {}
    existing.addons[event.data.addonType] = event.data.data
  },
  'identities.rollup': (store, event) => {
    [event.data.identity].forEach((identity) => {
      const identityEvent = new EventStoreEvent('identities', identity.id, 'create', identity, identity.createdAt, event.version)

      EventStore.RUNNERS.CREATE(store, identityEvent)
    })

    event.data.feeds.forEach((feed) => {
      const feedEvent = new EventStoreEvent('feeds', feed.id, 'create', feed, feed.createdAt, event.version)

      EventStore.RUNNERS.CREATE(store, feedEvent)
    })

    event.data.entries.forEach((entry) => {
      const entryEvent = new EventStoreEvent('entries', entry.id, 'create', entry, entry.createdAt, event.version)

      EventStore.RUNNERS.CREATE(store, entryEvent)
    })

    event.data.signals.forEach((signal) => {
      const signalEvent = new EventStoreEvent('signals', signal.id, 'create', signal, signal.createdAt, event.version)

      EventStore.RUNNERS.CREATE(store, signalEvent)
    })
  },
  'signals.create': EventStore.RUNNERS.CREATE,
  'signals.update': EventStore.RUNNERS.UPDATE,
  'signals.delete': EventStore.RUNNERS.DELETE
}
