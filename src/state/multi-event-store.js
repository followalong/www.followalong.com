import { v4 as uuidv4 } from 'uuid'
import EventStore from './event-store.js'

class MultipleEventStore extends EventStore {
  constructor (name, version, runners = {}) {
    super(name, version, runners)
    this._config = this._db
    this._configs = {}
    this._dbs = {}
    this.startedAt = Date.now()

    Object.defineProperty(this, 'events', {
      get: () => {
        return this.findAllEvents(undefined)
      },
      set () {
        throw new Error('Cannot set read-only attribute: events')
      }
    })

    const collectionNames = new Set()

    this.eachCollectionName((collectionName) => collectionNames.add(collectionName))

    for (const collectionName of collectionNames) {
      Object.defineProperty(this, collectionName, {
        get: () => {
          return this.findAll(undefined, collectionName)
        },
        set () {
          throw new Error(`Cannot set read-only attribute: ${collectionName}`)
        }
      })
    }
  }

  createDB (dbId, config = {}) {
    dbId = dbId || uuidv4()

    this.setConfig(dbId, config)
    this._initDB(dbId)

    return dbId
  }

  deleteDB (dbId) {
    const db = this._dbs[dbId]

    delete this._dbs[dbId]

    delete this._configs[dbId]

    return Promise.all([
      db ? db.teardown() : Promise.resolve(),
      this._config.removeItem(dbId)
    ])
  }

  teardownDBs () {
    const promises = []

    for (const id in this._dbs) {
      promises.push(this.deleteDB(id))
    }

    return Promise.all(promises)
  }

  getConfig (dbId) {
    return this._configs[dbId] || {}
  }

  setConfig (dbId, config) {
    this._configs[dbId] = config

    return this._config.setItem(dbId, config)
  }

  updateConfig (dbId, updates) {
    return this.setConfig(dbId, Object.assign({}, this.getConfig(dbId), updates))
  }

  track (dbId, ...args) {
    const dbs = this._findDBs(dbId ? [dbId] : undefined)

    return dbs.map((db) => db.track.apply(db, args))[0]
  }

  importRaw (dbId, ...args) {
    const dbs = this._findDBs(dbId ? [dbId] : undefined)
    const promises = dbs.map((db) => db.importRaw.apply(db, args))

    return Promise.all(promises)
  }

  reset (dbId, ...args) {
    const dbs = this._findDBs(dbId ? [dbId] : undefined)
    const promises = dbs.map((db) => db.reset.apply(db, args))

    return Promise.all(promises)
  }

  clear (dbId, ...args) {
    const dbs = this._findDBs(dbId ? [dbId] : undefined)
    const promises = dbs.map((db) => db.reset.apply(db, args))

    promises.push(this._config.clear())

    return Promise.all(promises)
  }

  rawCollection (dbId, collectionName) {
    const db = this._findDBs(dbId ? [dbId] : undefined)[0]

    return db ? db.rawCollection(collectionName) : []
  }

  generationFor (dbId) {
    return this._findDBs(dbId ? [dbId] : undefined)
      .reduce((total, db) => total + db.generation, 0)
  }

  // Sum of the per-store revisions, over the named collections or all of
  // them: it only rises, so a reader that sees the same number knows nothing
  // it depends on has been folded since.
  revisionFor (dbId, collections) {
    return this._findDBs(dbId ? [dbId] : undefined)
      .reduce((total, db) => total + db.revisionFor(collections), 0)
  }

  findAllEvents (dbId, ...args) {
    const dbs = this._findDBs(dbId ? [dbId] : undefined)

    return dbs.reduce((events, db) => {
      return events.concat(db.findAllEvents.apply(db, args))
    }, []).sort(EventStore.SORT_BY_TIME)
  }

  findAll (dbId, ...args) {
    const dbs = this._findDBs(dbId ? [dbId] : undefined)

    return dbs.reduce((collection, db) => {
      return collection.concat(db.findAll.apply(db, args))
    }, []).sort(EventStore.SORT_BY_CREATED_AT)
  }

  findAllWithDeleted (dbId, ...args) {
    const dbs = this._findDBs(dbId ? [dbId] : undefined)

    return dbs.reduce((collection, db) => {
      return collection.concat(db.findAllWithDeleted.apply(db, args))
    }, []).sort(EventStore.SORT_BY_CREATED_AT)
  }

  findById (dbId, ...args) {
    const dbs = this._findDBs(dbId ? [dbId] : undefined)

    return dbs
      .map((db) => db.findById.apply(db, args))
      .find((item) => item)
  }

  restore (...args) {
    return this._config
      .iterate((value, dbId) => {
        this._configs[dbId] = value || {}
        this._initDB(dbId)
      })
      .then(() => {
        const promises = []

        for (const key in this._dbs) {
          promises.push(this._dbs[key].restore(...args))
        }

        return Promise.all(promises)
      })
  }

  _initDB (dbId) {
    const db = new EventStore(`${this._name}-${dbId}`, this._version, this._runners)

    this._dbs[dbId] = db

    return db
  }

  _findDBs (dbIds) {
    if (!dbIds || !dbIds.length) {
      return Object.values(this._dbs)
    }

    const dbs = []

    for (const key in this._dbs) {
      if (dbIds.indexOf(key) !== -1) {
        dbs.push(this._dbs[key])
      }
    }

    return dbs
  }
}

export default MultipleEventStore
