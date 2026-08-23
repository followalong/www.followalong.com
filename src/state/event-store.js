import localForage from 'localforage'
import EventStoreEvent from './event-store-event.js'
import SUPERSEDING from './superseding.js'
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

    // Bumped whenever the log is re-folded, which replaces every projection
    // object. Readers holding references to them have to start over, and the
    // collection length alone cannot tell them: folding an event that only
    // changes an existing object leaves the count exactly as it was.
    this.generation = 0

    this.eachCollectionName((collectionName) => {
      this[collectionName] = this[collectionName] || []
      this._byId[collectionName] = this._byId[collectionName] || new Map()
    })
  }

  track (collection, objectId, action, data = {}, time = Date.now(), version = this._version) {
    const event = new EventStoreEvent(collection, objectId || uuidv4(), action, data, time, version)

    this._runEvent(event)
    this._supersede(event)
    this._db.setItem(event.key, event.toLocal())

    return event
  }

  // Drops the events this one replaces. Safe because every superseding action
  // is a timestamp: the newest carries the whole meaning, so the ones before
  // it cannot change the folded result.
  _supersede (event) {
    if (SUPERSEDING.indexOf(`${event.collection}.${event.action}`) === -1) {
      return
    }

    for (let i = this._events.length - 1; i >= 0; i--) {
      const old = this._events[i]

      // By key, not by identity: the store is reactive in the app, so what
      // comes back out of _events is a proxy and never === the event we just
      // pushed. Comparing by identity made this delete its own event.
      if (old.key === event.key ||
        old.collection !== event.collection ||
        old.objectId !== event.objectId ||
        old.action !== event.action) {
        continue
      }

      this._events.splice(i, 1)
      this._db.removeItem(old.key)
    }
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
    this.generation++

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
    const existing = store.findByIdWithDeleted(event.collection, event.objectId)

    // UPDATE falls back to here for an object it has not seen, so by the time
    // the real create replays there may already be one under this id. Fold
    // into it: pushing again would leave two objects sharing an id, one of
    // them indexed and the other a ghost that findAll still returns.
    if (existing) {
      Object.assign(existing, event.data, { id: event.objectId, createdAt: event.time, _collection: event.collection })

      return
    }

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
