import { v4 as uuidv4 } from 'uuid'
import EventStore from './event-store.js'

class MultipleEventStore extends EventStore {
  constructor (name, version, runners = {}) {
    super(name, version, runners)
    this._config = this._db
    this._dbs = {}

    Object.defineProperty(this, 'events', {
      get: () => {
        return this.findAllEvents(undefined)
      },
      set () {
        throw new Error('Cannot set read-only attribute: events')
      }
    })

    for (const key in runners) {
      const collectionName = key.split('.')[0]

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

  createDB (dbId) {
    dbId = dbId || uuidv4()

    this._setConfig(dbId, {})
    this._initDB(dbId)

    return dbId
  }

  deleteDB (dbId) {
    const db = this._dbs[dbId]

    delete this._dbs[dbId]

    return Promise.all([
      db.teardown(),
      this._config.removeItem(dbId)
    ])
  }

  _setConfig (dbId, config) {
    return this._config.setItem(dbId, config)
  }

  track (dbId, ...args) {
    const dbs = this._findDBs(dbId ? [dbId] : undefined)
    const promises = dbs.map((db) => db.track.apply(db, args))

    return Promise.all(promises)
  }

  importRaw (dbId, ...args) {
    const dbs = this._findDBs(dbId ? [dbId] : undefined)
    const promises = dbs.map((db) => db.importRaw.apply(db, args))

    return Promise.all(promises)
  }

  reset (dbId, ...args) {
    const dbs = this._findDBs(dbId ? [dbId] : undefined)
    const promises = dbs.map((db) => db.reset.apply(db, args))

    promises.push(this._config.clear())

    return Promise.all(promises)
  }

  findAllEvents (dbId, ...args) {
    const dbs = this._findDBs(dbId ? [dbId] : undefined)

    return dbs.reduce((events, db) => {
      return events.concat(db.findAllEvents.apply(db, args))
    }, []).sort(EventStore.SORT_BY_DATE)
  }

  findAll (dbId, ...args) {
    const dbs = this._findDBs(dbId ? [dbId] : undefined)

    return dbs.reduce((collection, db) => {
      return collection.concat(db.findAll.apply(db, args))
    }, []).sort(EventStore.SORT_BY_DATE)
  }

  findAllWithDeleted (dbId, ...args) {
    const dbs = this._findDBs(dbId ? [dbId] : undefined)

    return dbs.reduce((collection, db) => {
      return collection.concat(db.findAllWithDeleted.apply(db, args))
    }, []).sort(EventStore.SORT_BY_DATE)
  }

  findById (dbId, ...args) {
    const dbs = this._findDBs(dbId ? [dbId] : undefined)

    return dbs.reduce((collection, db) => {
      return collection.concat([db.findById.apply(db, args)])
    }, []).sort(EventStore.SORT_BY_DATE)[0]
  }

  restore (...args) {
    return this._config
      .iterate((value, dbId) => {
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
