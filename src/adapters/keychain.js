import localForage from 'localforage'

class KeychainAdapter {
  constructor (options) {
    this.db = localForage.createInstance({ name: 'followalong-keychain-v1' })
    this.keys = {}

    for (const key in options) {
      this[key] = options[key]
    }
  }

  add (encryptionStrategy, id) {
    const functions = {
      ask: 'addAsk',
      none: 'addNone',
      store: 'addStore'
    }

    return this[functions[encryptionStrategy]](id)
  }

  remove (id) {
    return this._removeKeyInStore(id)
      .then(() => this._removeKeyInMemory(id))
  }

  addAsk (id) {
    return new Promise((resolve, reject) => {
      this._askForKey().then((key) => {
        this._saveKeyInStore(id, 'ask')
          .then(() => {
            this._saveKeyInMemory(id, key)
            resolve()
          })
          .catch(reject)
      }).catch(reject)
    })
  }

  addStore (id) {
    return new Promise((resolve, reject) => {
      this._askForKey().then((key) => {
        this._saveKeyInStore(id, key)
          .then(() => {
            this._saveKeyInMemory(id, key)
            resolve()
          })
          .catch(reject)
      }).catch(reject)
    })
  }

  addNone (id) {
    return new Promise((resolve, reject) => {
      this._saveKeyInStore(id, 'none')
        .then(() => {
          this._saveKeyInMemory(id, '')
          resolve()
        })
        .catch(reject)
    })
  }

  _askForKey () {
    return new Promise((resolve, reject) => {
      const key = this.prompt.apply(window, ['What is the password?'])

      if (key === null) {
        return reject(new Error('No key supplied.'))
      }

      resolve(key)
    })
  }

  getKeys () {
    return this.db.keys()
  }

  getKey (id) {
    return new Promise((resolve, reject) => {
      if (typeof this.keys[id] !== 'undefined') {
        return resolve(this.keys[id])
      }

      this.db.getItem(id)
        .then((key) => {
          if (key === 'none') {
            this._saveKeyInMemory(id, '')
            return resolve(this.keys[id])
          } else if (key === 'ask') {
            return this._askForKey().then((key) => {
              this._saveKeyInMemory(id, key)
              resolve(key)
            }).catch(reject)
          } else if (typeof key !== 'undefined') {
            this._saveKeyInMemory(id, key)
            return resolve(key)
          }

          reject(new Error('No key.'))
        })
        .catch(reject)
    })
  }

  _saveKeyInMemory (id, value) {
    this.keys[id] = value
  }

  _saveKeyInStore (id, value) {
    return this.db.setItem(id, value)
  }

  _removeKeyInStore (id) {
    return this.db.removeItem(id)
  }

  _removeKeyInMemory (id) {
    delete this.keys[id]
  }
}

export default KeychainAdapter
