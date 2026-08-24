class Adapter {
  // A blank field counts as absent: clearing one in the form should hand the
  // default back, not an empty bucket key.
  static withDefaults (data) {
    const defaults = this.DEFAULTS || {}
    const filled = Object.assign({}, data)

    for (const key in defaults) {
      filled[key] = filled[key] || defaults[key]
    }

    return filled
  }

  constructor (adapterOptions, addon) {
    this.id = addon.id
    this.data = this.constructor.withDefaults(addon.data)
    this.type = this.constructor.name
    this.preview = this.preview || this.constructor.name
    this.fields = []

    for (const key in adapterOptions) {
      this[key] = adapterOptions[key]
    }
  }

  // What another device has to be told, given it will run this same
  // constructor: anything it would fill in identically is left out, because a
  // shorter setup code is a denser QR code a camera has to read off a screen.
  portableData () {
    const defaults = this.constructor.DEFAULTS || {}

    return Object.keys(this.data).reduce((data, key) => {
      if (this.data[key] !== defaults[key]) data[key] = this.data[key]

      return data
    }, {})
  }
}

export default Adapter
