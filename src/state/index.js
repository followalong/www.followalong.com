import { v4 as uuidv4 } from 'uuid'

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

  findById (model, id) {
    return this.findAll(model, (item) => item.id === `${id}`)[0]
  }

  findOrCreateById (model, id, data) {
    let existing = this.findById(model, id)

    if (existing) {
      for (const key in data) {
        existing[key] = data[key]
      }
    } else {
      existing = this.add(model, [data])[0]
    }

    return existing
  }

  find (model, where) {
    return this.findAll(model, where)[0]
  }

  add (model, data, applyToEach) {
    const instances = data.map((instance) => {
      const i = Object.assign({}, instance)

      i.id = i.id || uuidv4()

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
