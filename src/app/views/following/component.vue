<template>
  <div class="md:px-6 md:py-5 max-w-river md:mx-auto">
    <div class="bg-white border-y md:border border-hairline-strong md:rounded-xl overflow-hidden">
      <ListRow
        v-for="feed in feeds"
        :key="feed.id"
        :title="app.queries.titleForFeed(feed)"
        :meta="metaFor(feed)"
        :to="`/${app.queries.urlForFeed(feed)}`"
        :muted="app.queries.isFeedPaused(feed)"
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
    feeds () {
      return this.app.queries.feedsForIdentity(this.identity)
    }
  },

  methods: {
    metaFor (feed) {
      if (this.app.queries.isFeedPaused(feed)) return 'Paused'

      const count = this.app.queries.entriesForFeed(this.identity, feed).length
      const last = this.app.queries.niceDateForEntry(
        this.app.queries.lastEntryForFeed(this.identity, feed)
      )

      return last ? `${count} items · last ${last}` : `${count} items`
    }
  }
}
</script>
