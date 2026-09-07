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

    // Every key currently in _events. importRaw asks it once per line, and
    // asking the array instead made a merge quadratic: 25k lines against 25k
    // events is 300M comparisons before a single new event is folded.
    this._keys = new Set()

    // Keys of the superseding events in _events, bucketed by what they
    // supersede, so tracking one knows whether there is anything to drop and
    // can stop looking once it has found it.
    this._supersedable = new Map()

    // Bumped on every applied event so readers can cache derived work and
    // know when to throw it away.
    this.revision = 0

    // The same, per collection. A poll writes a feeds.fetched event per feed,
    // and the whole revision counts those, so a reader caching anything about
    // entries threw it away hundreds of times a cycle for changes that could
    // not touch an entry.
    this._revisions = {}

    // Bumped whenever the log is re-folded, which replaces every projection
    // object. Readers holding references to them have to start over, and the
    // collection length alone cannot tell them: folding an event that only
    // changes an existing object leaves the count exactly as it was.
    this.generation = 0

    this.eachCollectionName((collectionName) => {
      this[collectionName] = this[collectionName] || []
      this._byId[collectionName] = this._byId[collectionName] || new Map()
      this._revisions[collectionName] = this._revisions[collectionName] || 0
    })
  }

  // Naming the collections a reader cares about answers for those alone. The
  // sum only ever rises, so a change to any of them changes the answer.
  revisionFor (collections) {
    if (!collections) {
      return this.revision
    }

    let total = 0

    for (let i = 0; i < collections.length; i++) {
      total += this._revisions[collections[i]] || 0
    }

    return total
  }

  // For a runner that folds into collections other than its event's own.
  // Over-reporting only costs a reader its cache; under-reporting hands it
  // stale answers, so anything unsure says everything.
  bumpEveryRevision () {
    this.eachCollectionName((collectionName) => {
      this._revisions[collectionName] = (this._revisions[collectionName] || 0) + 1
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
    const doomed = this._supersededBy(event)

    if (!doomed || !doomed.size) {
      return
    }

    let remaining = doomed.size

    // Backwards, because what this drops was written on the last poll and so
    // sits near the end. Walking the whole log for each of 200 feeds is a scan
    // of the entire history two hundred times a cycle.
    for (let i = this._events.length - 1; i >= 0 && remaining; i--) {
      // By key, not by identity: the store is reactive in the app, so what
      // comes back out of _events is a proxy and never === the event we just
      // pushed. Comparing by identity made this delete its own event.
      const key = this._events[i].key

      if (!doomed.has(key)) {
        continue
      }

      this._events.splice(i, 1)
      this._keys.delete(key)
      this._db.removeItem(key)
      remaining--
    }
  }

  // The keys this event replaces, and the bucket left holding only this one.
  _supersededBy (event) {
    if (SUPERSEDING.indexOf(`${event.collection}.${event.action}`) === -1) {
      return null
    }

    const id = `${event.collection}/${event.objectId}/${event.action}`
    const bucket = this._supersedable.get(id) || new Set()

    this._supersedable.set(id, new Set([event.key]))

    bucket.delete(event.key)

    return bucket
  }

  // Folding a log cannot supersede as it goes: the event that supersedes
  // another may be folded before it, and a merge is exactly where an old
  // event turns up late. So the decision is made once every event is in, by
  // time rather than by the order they happened to arrive in.
  //
  // Without this every merge from the bucket brought back what this device
  // had already dropped, and the next upload carried them on to every other
  // device. One log held 4,591 poll records for 132 feeds.
  _pruneSuperseded () {
    const doomed = new Set()

    this._supersedable.forEach((bucket, id) => {
      if (bucket.size < 2) {
        return
      }

      let newest = null

      bucket.forEach((key) => {
        if (newest === null || EventStore.TIME_OF(key) > EventStore.TIME_OF(newest)) {
          newest = key
        }
      })

      bucket.forEach((key) => {
        if (key !== newest) {
          doomed.add(key)
        }
      })

      this._supersedable.set(id, new Set([newest]))
    })

    if (!doomed.size) {
      return
    }

    // One pass over the log. What this drops sorts by time near the front,
    // which is the opposite end from where tracking a single event looks, so
    // scanning per dropped event would walk the whole log every time.
    const kept = []

    for (let i = 0; i < this._events.length; i++) {
      const event = this._events[i]

      if (!doomed.has(event.key)) {
        kept.push(event)

        continue
      }

      this._keys.delete(event.key)
      this._db.removeItem(event.key)
    }

    this._events.splice(0)

    for (let i = 0; i < kept.length; i++) {
      this._events.push(kept[i])
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
      const key = splat.shift()

      // Nearly every line of a merge is one we already hold, and parsing its
      // payload to find that out is most of the work a merge does.
      if (this._keys.has(key)) {
        return
      }

      const event = EventStoreEvent.from(key, splat.join(' '))

      if (!event || this._keys.has(event.key)) {
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
    const events = this._events.concat(imported).sort(EventStore.SORT_FOR_FOLD)

    this._resetCollections()
    this._events.splice(0)
    this._keys.clear()
    this._supersedable.clear()

    events.forEach((event) => this._runEvent(event))

    this._pruneSuperseded()
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
          .sort(EventStore.SORT_FOR_FOLD)
          .forEach((event) => this._runEvent(event))

        // A log written before anything pruned it is full of events that
        // decide nothing, so it is pruned on the way in rather than left to
        // wait for a merge.
        this._pruneSuperseded()
      })
  }

  reset () {
    this._resetCollections()
    this._events.splice(0)
    this._keys.clear()
    this._supersedable.clear()

    return this._db.clear()
  }

  _resetCollections () {
    this.generation++
    this.revision++

    this.bumpEveryRevision()

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

    // The key is the identity: time, collection, object, action and version.
    // Two events tracked in the same millisecond against the same object are
    // therefore the same event, and the database already stores them as one
    // — so holding both here left memory disagreeing with disk, and left
    // superseding nothing to drop, since what it would drop is itself.
    if (this._keys.has(event.key)) {
      const at = this._events.findIndex((held) => held.key === event.key)

      at === -1 ? this._events.push(event) : this._events.splice(at, 1, event)
    } else {
      this._events.push(event)
      this._keys.add(event.key)
    }

    if (SUPERSEDING.indexOf(`${event.collection}.${event.action}`) !== -1) {
      const id = `${event.collection}/${event.objectId}/${event.action}`
      const bucket = this._supersedable.get(id) || new Set()

      bucket.add(event.key)
      this._supersedable.set(id, bucket)
    }

    this.revision++
    this._revisions[event.collection] = (this._revisions[event.collection] || 0) + 1
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

// The time an event key starts with. Keys are what a bucket of superseded
// events holds, and the time in them is the one thing that decides which of
// them is still worth keeping.
EventStore.TIME_OF = (key) => parseInt(key) || 0

// A rollup is a snapshot of where everything had got to, not something that
// happened at a moment, so it folds before every other event whatever its
// timestamp and the history applies on top of it. Sorted by time instead, it
// landed in the middle of the history it summarises, and anything older than
// it folded against objects that did not exist yet and was dropped in
// silence. The cost of this choice is that a stale event can beat the
// snapshot; losing sight of an article is worse than one flipping back to
// unread.
EventStore.IS_A_SNAPSHOT = (event) => event.collection === 'identities' && event.action === 'rollup'

EventStore.SORT_FOR_FOLD = (a, b) => {
  const snapshots = (EventStore.IS_A_SNAPSHOT(b) ? 1 : 0) - (EventStore.IS_A_SNAPSHOT(a) ? 1 : 0)

  return snapshots || EventStore.SORT_BY_TIME(a, b)
}

EventStore.SORT_BY_TIME = (a, b) => {
  return (a.time || 0) - (b.time || 0)
}

EventStore.SORT_BY_CREATED_AT = (a, b) => {
  return (a.createdAt || 0) - (b.createdAt || 0)
}

export default EventStore
