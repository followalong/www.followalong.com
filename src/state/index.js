import uniqId from 'uniq-id'

const generateId = uniqId.generateUUID('xxxxyxxxxyxxxxyxxxxyxxxxyxxxxyxxxxyxxxxy', 32)

class State {
  constructor (data) {
    this.data = data
  }

  findAll (model, where) {
    let instances = this.data[model]

    if (where) {
      instances = instances.filter(where)
    }

    return instances
  }

  find (model, where) {
    return this.findAll(model, where)[0]
  }

  add (model, data, applyToEach) {
    const instances = data.map((instance) => {
      const i = Object.assign({}, instance)

      i.id = i.id || generateId()

      if (typeof applyToEach === 'function') {
        applyToEach(i)
      }

      return i
    })

    this.data[model].push.apply(this.data[model], instances)

    return instances
  }

  removeAll (model, instances) {
    instances.forEach((instance) => {
      const index = this.data[model].indexOf(instance)

      this.data[model].splice(index, 1)
    })
  }
}

export default State
