import AddonAdapter from '../addon.js'

class NoneAddonAdapter extends AddonAdapter {
  constructor (adapterOptions, addonData) {
    super(adapterOptions, addonData)

    this.adapter = 'none'
    this.name = this.data.name || 'None'
    this.description = 'No addon will be used.'
    this.supports = ['rss', 'search', 'sync']
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

  rss () {
    return Promise.resolve()
  }

  search () {
    return Promise.resolve()
  }
}

export default NoneAddonAdapter
