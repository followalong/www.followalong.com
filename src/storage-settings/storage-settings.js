import localForage from 'localforage'
import Adapters from './adapters/index.js'
import { encode, decode } from 'js-base64'

class NoDataError extends Error {}

const PASSTHROUGH_DATA_PREPPER = (data) => {
  return data
}

const getAtNamespace = (existingValue, namespace) => {
  if (!namespace) {
    return existingValue
  }

  const obj = Object.assign({}, existingValue)
  obj[namespace] = obj[namespace] || {}
  return obj[namespace]
}

const setAtNamespace = (existingObj, value, namespace) => {
  if (!namespace) {
    return value
  }

  const obj = Object.assign({}, existingObj)
  obj[namespace] = value || {}
  return obj
}

class StorageSettings {
  constructor (name) {
    this._db = localForage.createInstance({ name })
  }

  get (key, namespace) {
    return new Promise((resolve, reject) => {
      this._db.getItem(key)
        .then((config) => {
          resolve(getAtNamespace(config, namespace))
        })
        .catch(reject)
    })
  }

  set (key, config, namespace = null) {
    return new Promise((resolve, reject) => {
      const content = JSON.parse(JSON.stringify(config))

      this.get(key, null)
        .then((obj) => {
          const data = setAtNamespace(obj, content, namespace)

          this._db.setItem(key, data)
            .then(resolve)
            .catch(reject)
        })
        .catch(reject)
    })
  }

  remove (key) {
    return this._db.removeItem(key)
  }

  fetch (key, dataPrepper = PASSTHROUGH_DATA_PREPPER, namespace = null) {
    return new Promise((resolve, reject) => {
      this.get(key, namespace)
        .then((options) => {
          const Adapter = Adapters[options.type] || Adapters.none
          const adapter = new Adapter(dataPrepper(options.data))

          if (adapter.constructor === Adapters.none) {
            return reject(new NoDataError('No data was expected.'))
          }

          adapter
            .fetch()
            .then(resolve)
            .catch(reject)
        })
        .catch(reject)
    })
  }

  verify (options) {
    return new Promise((resolve, reject) => {
      const Adapter = Adapters[options.type] || Adapters.none
      const adapter = new Adapter(options.data)

      if (adapter.constructor === Adapters.none) {
        return resolve()
      }

      adapter
        .fetch()
        .then(resolve)
        .catch(reject)
    })
  }

  put (key, data, dataPrepper = PASSTHROUGH_DATA_PREPPER, namespace = null) {
    return new Promise((resolve, reject) => {
      this.get(key, namespace)
        .then((options) => {
          const Adapter = Adapters[options.type] || Adapters.none
          const adapter = new Adapter(dataPrepper(options.data))

          adapter
            .put(data)
            .then(() => resolve())
            .catch(reject)
        })
        .catch(reject)
    })
  }

  getRawConfig (id, namespace = null) {
    return new Promise((resolve, reject) => {
      this.get(id, namespace)
        .then((config) => {
          let obj = {}

          if (namespace) {
            obj[namespace] = config
          } else {
            // not sure we want to do this
            obj = config
          }

          obj.id = id

          resolve(encode(JSON.stringify(obj)))
        })
        .catch(reject)
    })
  }

  parseConfigString (configString) {
    return new Promise((resolve, reject) => {
      try {
        resolve(JSON.parse(decode(configString)))
      } catch (e) {
        reject(new Error('Could not parse configuration.'))
      }
    })
  }

  reset () {
    return this._db.clear()
  }
}

export default StorageSettings
