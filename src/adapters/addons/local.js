import localForage from 'localforage'
import Adapter from './adapter.js'
import sortByReadAndDate from '../../queries/sorters/sort-by-read-and-date.js'

const LIMIT_ITEMS = (n) => {
  let reads = n

  return (item, index) => {
    if (item.savedAt) {
      return true
    }

    if (item.readAt) {
      if (reads > 0) {
        reads--
        return true
      } else {
        return false
      }
    }

    return true
  }
}

class Local extends Adapter {
  constructor (adapterOptions, addonData) {
    super(adapterOptions, addonData)

    this.adapter = 'local'
    this.name = this.data.name || 'Local Storage'
    this.data.encryptionStrategy = this.data.encryptionStrategy || 'none'
    this.data.maxReadLimit = this.data.maxReadLimit || 150

    this.db = localForage.createInstance({
      name: 'followalong-v1'
    })
  }

  save (identityData, encrypt) {
    return this.db.setItem(
      identityData.id,
      encrypt(this.format(identityData))
    )
  }

  get (identity, decrypt) {
    return new Promise((resolve, reject) => {
      this.db.getItem(identity.id)
        .then((identityData) => resolve(decrypt(identityData)))
        .catch(reject)
    })
  }

  remove (id) {
    return this.db.removeItem(id)
  }

  format (identityData) {
    identityData = super.format(identityData)

    identityData.items = identityData.items
      .sort(sortByReadAndDate())
      .filter(LIMIT_ITEMS(this.data.maxReadLimit))

    return identityData
  }

  preview () {
    return `${this.data.name || this.name} (${this.data.maxReadLimit} max read limit)`
  }
}

Local.FIELDS = {
  maxReadLimit: {
    type: 'number',
    label: 'Maximum number of "read" items to keep',
    hint: 'Unread and Saved items are always kept.',
    required: true,
    placeholder: 150
  }
}

export default Local
