<template>
  <div class="md:px-6 md:py-5 max-w-river md:mx-auto">
    <div class="bg-white border-y md:border border-hairline-strong md:rounded-xl overflow-hidden">
      <ListRow
        v-for="feed in feeds"
        :key="feed.id"
        :title="app.queries.titleForFeed(feed)"
        :meta="metaFor(feed)"
        :to="`/${app.queries.urlForFeed(feed)}`"
        :muted="!unreadFor(feed)"
        :aria-label="`Visit ${app.queries.titleForFeed(feed)} feed`"
      >
        <template #leading>
          <span class="h-slot w-slot flex-none rounded-field bg-surface-sunken overflow-hidden flex items-center justify-center">
            <img
              v-if="app.queries.imageForFeed(feed)"
              class="h-full w-full object-cover"
              :src="app.queries.imageForFeed(feed)"
              alt=""
            >
            <span
              v-else
              class="text-field font-bold text-ink-subtle"
            >{{ (app.queries.titleForFeed(feed) || '?').trim().charAt(0).toUpperCase() }}</span>
          </span>
        </template>

        <template #trailing>
          <span
            v-if="unreadFor(feed)"
            class="flex-none rounded-pill bg-accent px-2 py-0.5 text-tiny font-bold text-ink"
          >{{ unreadFor(feed) }} new</span>
        </template>
      </ListRow>
    </div>

    <p
      v-if="!feeds.length"
      class="p-4 text-body text-ink-secondary"
    >
      You are not following any feeds yet. Use search to paste an RSS URL.
    </p>
  </div>
</template>

<script>
import ListRow from '../../components/list-row/component.vue'

export default {
  components: {
    ListRow
  },

  props: ['app', 'identity'],

  computed: {
    // Feeds with something waiting come first: the question this page answers
    // is "what should I open?", not "what am I subscribed to?".
    feeds () {
      return this.app.queries.feedsForIdentity(this.identity)
        .slice()
        .sort((a, b) => this.unreadFor(b) - this.unreadFor(a))
    }
  },

  methods: {
    unreadFor (feed) {
      return this.app.queries.unreadEntriesForFeedLength(this.identity, feed)
    },

    metaFor (feed) {
      if (this.app.queries.isFeedPaused(feed)) return 'Paused'

      if (!this.unreadFor(feed)) {
        const last = this.app.queries.niceDateForEntry(
          this.app.queries.lastEntryForFeed(this.identity, feed)
        )

        return last ? `Nothing new · last ${last}` : 'Nothing new'
      }

      return `${this.app.queries.entriesForFeed(this.identity, feed).length} items`
    }
  }
}
</script>
