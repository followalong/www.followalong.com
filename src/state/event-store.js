import localForage from 'localforage'
import EventStoreEvent from './event-store-event.js'
import { v4 as uuidv4 } from 'uuid'

class EventStore {
  constructor (name, version, runners = {}) {
    this._events = []
    this._name = name
    this._db = localForage.createInstance({ name })
    this._runners = runners
    this._version = version

    for (const key in runners) {
      const collectionName = key.split('.')[0]

      this[collectionName] = this[collectionName] || []
    }
  }

  track (collection, objectId, action, data = {}, time = Date.now(), version = this._version) {
    const event = new EventStoreEvent(collection, objectId || uuidv4(), action, data, time, version)

    this._runEvent(event)
    this._db.setItem(event.key, event.toLocal())
  }

  importRaw (data) {
    const lines = (data || '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.trim().length > 0)

    lines.forEach((line) => {
      const splat = line.split(' ')
      const event = EventStoreEvent.from(splat.shift(), splat.join(' '))

      if (this._events.find((e) => e.key === event.key)) {
        return
      }

      this._runEvent(event)
      this._db.setItem(event.key, event.toLocal())
    })
  }

  findAllEvents () {
    return this._events
      .sort(EventStore.SORT_BY_DATE)
  }

  findAll (collectionName) {
    return this[collectionName].filter((item) => !item._deleted)
  }

  findAllWithDeleted (collectionName) {
    return this[collectionName]
  }

  findById (collectionName, id) {
    return this
      .findAll(collectionName)
      .find((item) => item.id === id)
  }

  findByIdWithDeleted (collectionName, id) {
    return this
      .findAllWithDeleted(collectionName)
      .find((item) => item.id === id)
  }

  restore () {
    return this._db
      .iterate((value, key) => {
        this._runEvent(EventStoreEvent.from(key, value))
      })
  }

  reset () {
    return this._db.clear()
  }

  teardown () {
    return localForage.dropInstance({ name: this._name })
  }

  _findOldRunnerForEvent (event) {
    return this._runners[event.version] && this._runners[event.version][`${event.collection}.${event.action}`]
  }

  _runEvent (event) {
    const runner = this._findOldRunnerForEvent(event) || this._runners[`${event.collection}.${event.action}`]

    if (!runner) {
      return console.warn(`No runner found for event: ${event.collection}.${event.action}`, event)
    }

    runner.call(this, event)

    this._events.push(event)
  }
}

EventStore.RUNNERS = {
  CREATE (event) {
    const collection = this[event.collection]

    collection.push(Object.assign({}, event.data, { id: event.objectId, createdAt: event.time, _collection: event.collection }))
  },

  UPDATE (event) {
    const collection = this[event.collection]
    const existing = collection.find((item) => item.id === event.objectId)

    if (!existing) {
      return EventStore.RUNNERS.CREATE.call(this, event)
    }

    existing.updatedAt = event.time

    for (const key in event.data) {
      existing[key] = event.data[key]
    }
  },

  DELETE (event) {
    const collection = this[event.collection]
    const existing = collection.find((item) => item.id === event.objectId)

    existing._deleted = true
  }
}

EventStore.SORT_BY_DATE = (a, b) => {
  if (a.date < b.date) return -1
  if (a.date > b.date) return 1
  return 0
}

export default EventStore