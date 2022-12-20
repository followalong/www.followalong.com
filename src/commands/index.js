class Commands {
  constructor (options) {
    for (const key in options) {
      this[key] = options[key]
    }
  }
}

export default Commands
