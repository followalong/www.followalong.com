class Adapter {
  constructor (adapterOptions, addon) {
    this.id = addon.id
    this.data = addon.data || {}
    this.type = this.constructor.name
    this.preview = this.preview || this.constructor.name
    this.fields = []

    for (const key in adapterOptions) {
      this[key] = adapterOptions[key]
    }
  }
}

export default Adapter
