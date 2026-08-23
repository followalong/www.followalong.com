import Adapter from './adapter.js'

class None extends Adapter {
  constructor (adapterOptions, addonData) {
    super(adapterOptions, addonData)

    this.adapter = 'none'
    this.name = this.data.name || 'None'
    this.description = 'No addon will be used.'
  }

  get () {
    return Promise.resolve()
  }

  save () {
    return Promise.resolve()
  }

  destroy () {
    return Promise.resolve()
  }

  rss (url, options) {
    return this.fetch(url, options)
  }

  search () {
    return Promise.resolve()
  }
}

None.FIELDS = []

export default None
