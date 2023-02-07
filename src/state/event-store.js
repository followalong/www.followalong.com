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

    this.eachCollectionName((collectionName) => {
      this[collectionName] = this[collectionName] || []
    })
  }

  track (collection, objectId, action, data = {}, time = Date.now(), version = this._version) {
    const event = new EventStoreEvent(collection, objectId || uuidv4(), action, data, time, version)

    this._runEvent(event)
    this._db.setItem(event.key, event.toLocal())
  }

  eachCollectionName (func) {
    for (const key in this._runners) {
      if (/^v[0-9.]+$/.test(key)) {
        continue
      }

      const collectionName = key.split('.')[0]

      func(collectionName)
    }
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
    this.eachCollectionName((collectionName) => {
      this[collectionName].splice(0)
    })

    this._events.splice(0)

    return this._db.clear()
  }

  teardown () {
    return localForage.dropInstance({ name: this._name })
  }

  _findSpecificRunnerForEvent (event) {
    return this._runners[event.version] && this._runners[event.version][`${event.collection}.${event.action}`]
  }

  _runEvent (event) {
    const runner = this._findSpecificRunnerForEvent(event) || this._runners[`${event.collection}.${event.action}`]

    if (!runner) {
      return console.warn(`No runner found for event: ${event.collection}.${event.action}`, event)
    }

    runner(this, event)

    this._events.push(event)
  }
}

EventStore.RUNNERS = {
  CREATE (store, event) {
    const collection = store[event.collection]

    collection.push(Object.assign({}, event.data, { id: event.objectId, createdAt: event.time, _collection: event.collection }))
  },

  UPDATE (store, event) {
    const collection = store[event.collection]
    const existing = collection.find((item) => item.id === event.objectId)

    if (!existing) {
      return EventStore.RUNNERS.CREATE(store, event)
    }

    existing.updatedAt = event.time
    existing.data = existing.data || {}

    for (const key in event.data) {
      existing.data[key] = event.data[key]
    }
  },

  DELETE (store, event) {
    const collection = store[event.collection]
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
