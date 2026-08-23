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

    // id -> object, per collection. Folding a log is O(events x objects)
    // without it, and every lookup rescans the collection.
    this._byId = {}

    // Bumped on every applied event so readers can cache derived work and
    // know when to throw it away.
    this.revision = 0

    this.eachCollectionName((collectionName) => {
      this[collectionName] = this[collectionName] || []
      this._byId[collectionName] = this._byId[collectionName] || new Map()
    })
  }

  track (collection, objectId, action, data = {}, time = Date.now(), version = this._version) {
    const event = new EventStoreEvent(collection, objectId || uuidv4(), action, data, time, version)

    this._runEvent(event)
    this._db.setItem(event.key, event.toLocal())

    return event
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

    const imported = []

    lines.forEach((line) => {
      const splat = line.split(' ')
      const event = EventStoreEvent.from(splat.shift(), splat.join(' '))

      if (!event || this._events.find((e) => e.key === event.key)) {
        return
      }

      imported.push(event)
      this._db.setItem(event.key, event.toLocal())
    })

    if (!imported.length) {
      return
    }

    // An imported event can predate events already folded in, so replaying it
    // on top would let a stale change win just by arriving late. Fold the whole
    // log again in time order instead.
    const events = this._events.concat(imported).sort(EventStore.SORT_BY_TIME)

    this._resetCollections()
    this._events.splice(0)

    events.forEach((event) => this._runEvent(event))
  }

  findAllEvents () {
    return this._events
      .slice(0)
      .sort(EventStore.SORT_BY_TIME)
  }

  findAll (collectionName) {
    return this[collectionName].filter((item) => !item._deleted)
  }

  findAllWithDeleted (collectionName) {
    return this[collectionName]
  }

  // The live array, append-ordered and not copied. Readers that maintain their
  // own indexes use it to see only what is new since they last looked.
  rawCollection (collectionName) {
    return this[collectionName] || []
  }

  findById (collectionName, id) {
    const item = this.findByIdWithDeleted(collectionName, id)

    return item && !item._deleted ? item : undefined
  }

  findByIdWithDeleted (collectionName, id) {
    const index = this._byId[collectionName]

    return index ? index.get(id) : undefined
  }

  index (collectionName, item) {
    this._byId[collectionName] = this._byId[collectionName] || new Map()
    this._byId[collectionName].set(item.id, item)
  }

  restore () {
    const events = []

    return this._db
      .iterate((value, key) => {
        const event = EventStoreEvent.from(key, value)

        if (event !== null) {
          events.push(event)
        }
      })
      .then(() => {
        events
          .sort(EventStore.SORT_BY_TIME)
          .forEach((event) => this._runEvent(event))
      })
  }

  reset () {
    this._resetCollections()
    this._events.splice(0)

    return this._db.clear()
  }

  _resetCollections () {
    this.eachCollectionName((collectionName) => {
      this[collectionName].splice(0)
      this._byId[collectionName] = new Map()
    })
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
    this.revision++
  }
}

EventStore.RUNNERS = {
  CREATE (store, event) {
    const item = Object.assign({}, event.data, { id: event.objectId, createdAt: event.time, updatedAt: (event.data || {}).updatedAt || 0, _collection: event.collection })

    store[event.collection].push(item)
    store.index(event.collection, item)
  },

  UPDATE (store, event) {
    const existing = store.findByIdWithDeleted(event.collection, event.objectId)

    if (!existing) {
      return EventStore.RUNNERS.CREATE(store, event)
    }

    existing.updatedAt = event.time

    for (const key in event.data) {
      existing[key] = event.data[key]
    }
  },

  DELETE (store, event) {
    const existing = store.findByIdWithDeleted(event.collection, event.objectId)

    if (!existing) {
      return console.warn(`Object not found for event: ${JSON.stringify(event)}`)
    }

    existing._deleted = true
    existing.deletedAt = event.time
  }
}

EventStore.SORT_BY_TIME = (a, b) => {
  return (a.time || 0) - (b.time || 0)
}

EventStore.SORT_BY_CREATED_AT = (a, b) => {
  return (a.createdAt || 0) - (b.createdAt || 0)
}

export default EventStore
