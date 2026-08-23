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
    // Values are written through the identity's cipher; keys stay in the
    // clear because restore has to parse and sort by them.
    this._encrypt = (data) => Promise.resolve(data)
    this._decrypt = (data) => Promise.resolve(data)
    this.undecryptable = 0

    this.eachCollectionName((collectionName) => {
      this[collectionName] = this[collectionName] || []
    })
  }

  track (collection, objectId, action, data = {}, time = Date.now(), version = this._version) {
    const event = new EventStoreEvent(collection, objectId || uuidv4(), action, data, time, version)

    this._runEvent(event)

    // Encryption is async, the write already was, and track() is not — so the
    // event is returned now and lands on disk a tick later, as before.
    this._write(event)

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
      this._write(event)
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

  setCipher ({ encrypt, decrypt }) {
    this._encrypt = encrypt
    this._decrypt = decrypt

    return this
  }

  // Re-persists every event through the current cipher. Nothing is deleted:
  // each key is overwritten in place, so a failure part-way leaves a log that
  // still reads, because decryption is decided per value.
  rewriteAll () {
    return Promise.all(this._events.map((event) => this._write(event)))
  }

  _write (event) {
    return Promise.resolve(this._encrypt(event.toLocal()))
      .then((value) => this._db.setItem(event.key, value))
  }

  restore () {
    const events = []

    this.undecryptable = 0

    const stored = []

    return this._db
      .iterate((value, key) => { stored.push({ key, value }) })
      .then(() => Promise.all(stored.map(({ key, value }) => {
        return Promise.resolve(this._decrypt(value))
          .then((decoded) => {
            const event = EventStoreEvent.from(key, decoded)

            if (event !== null) events.push(event)
          })
          .catch(() => {
            // The value stays on disk untouched; it just cannot be read with
            // the password we were given.
            this.undecryptable++
          })
      })))
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
  }
}

EventStore.RUNNERS = {
  CREATE (store, event) {
    const collection = store[event.collection]

    collection.push(Object.assign({}, event.data, { id: event.objectId, createdAt: event.time, updatedAt: (event.data || {}).updatedAt || 0, _collection: event.collection }))
  },

  UPDATE (store, event) {
    const collection = store[event.collection]
    const existing = collection.find((item) => item.id === event.objectId)

    if (!existing) {
      return EventStore.RUNNERS.CREATE(store, event)
    }

    existing.updatedAt = event.time

    for (const key in event.data) {
      existing[key] = event.data[key]
    }
  },

  DELETE (store, event) {
    const collection = store[event.collection]
    const existing = collection.find((item) => item.id === event.objectId)

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
