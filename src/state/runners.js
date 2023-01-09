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
  'signals.create': EventStore.RUNNERS.CREATE,
  'signals.update': EventStore.RUNNERS.UPDATE,
  'signals.delete': EventStore.RUNNERS.DELETE
}
