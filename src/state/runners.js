import EventStore from './event-store'

export default {
  'feeds.create': EventStore.RUNNERS.CREATE,
  'feeds.update': EventStore.RUNNERS.UPDATE,
  'feeds.delete': EventStore.RUNNERS.DELETE,
  'entries.create': EventStore.RUNNERS.CREATE,
  'entries.update': EventStore.RUNNERS.UPDATE,
  'entries.delete': EventStore.RUNNERS.DELETE,
  'identities.create': EventStore.RUNNERS.CREATE,
  'identities.delete': EventStore.RUNNERS.DELETE
}
