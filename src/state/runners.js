import EventStore from './event-store'

export default {
  'feeds.create': EventStore.RUNNERS.CREATE,
  'feeds.delete': EventStore.RUNNERS.DELETE,
  'entries.create': EventStore.RUNNERS.CREATE,
  'entries.delete': EventStore.RUNNERS.DELETE,
  'identities.create': EventStore.RUNNERS.CREATE,
  'identities.delete': EventStore.RUNNERS.DELETE
}
