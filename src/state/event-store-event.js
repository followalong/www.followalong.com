class EventStoreEvent {
  constructor (collection, objectId, action, data, time, version) {
    this.collection = collection
    this.objectId = objectId
    this.action = action
    this.data = data
    this.time = time
    this.version = version
    this.key = `${this.time}/${this.collection}/${this.objectId}/${this.action}/${this.version}`
  }

  toLocal () {
    if (typeof this.data === 'string' || this.data === null || typeof this.data === 'undefined') {
      return this.data
    } else {
      return JSON.stringify(this.data)
    }
  }

  toRemote () {
    return {
      collection: this.collection,
      objectId: this.objectId,
      action: this.action,
      data: this.data,
      time: this.time,
      version: this.version
    }
  }
}

const KEY_MATCHER = /(?<time>\d+)\/(?<collection>\w+)\/(?<objectId>[\w-:]+)\/(?<action>[\w-_]+)\/(?<version>[\w-._]+)/
EventStoreEvent.parseEvent = (key) => key.match(KEY_MATCHER).groups
EventStoreEvent.from = (key, value) => {
  try {
    const opts = EventStoreEvent.parseEvent(key)

    value = JSON.parse(value)

    return new EventStoreEvent(
      opts.collection,
      opts.objectId,
      opts.action,
      value,
      parseInt(opts.time),
      opts.version
    )
  } catch (e) {
    console.warn('Could not parse event', key, value, e)

    return null
  }
}

export default EventStoreEvent
