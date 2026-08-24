<template>
  <PageBody>
    <SearchBox
      v-if="allFeeds.length"
      v-model="filter"
      scope="feeds"
      aria-label="Filter feeds"
      :hint="`${feeds.length} feeds`"
    />

    <Card :padded="false">
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
            v-if="app.queries.isFeedPaused(feed)"
            data-paused-badge
            class="flex-none rounded-pill bg-surface-sunken px-2 py-0.5 text-tiny font-bold text-ink-muted"
          >Paused</span>
          <span
            v-if="unreadFor(feed)"
            class="flex-none rounded-pill bg-accent px-2 py-0.5 text-tiny font-bold text-ink"
          >{{ unreadFor(feed) }} new</span>
        </template>
      </ListRow>
    </Card>

    <EmptyState v-if="!allFeeds.length">
      You are not following any feeds yet. Use search to paste an RSS URL.
    </EmptyState>

    <EmptyState v-else-if="!feeds.length">
      No feeds match “{{ filter }}”.
    </EmptyState>
  </PageBody>
</template>

<script>
import ListRow from '../../components/list-row/component.vue'
import PageBody from '../../components/page-body/component.vue'
import Card from '../../components/card/component.vue'
import EmptyState from '../../components/empty-state/component.vue'
import SearchBox from '../../components/search-box/component.vue'

export default {
  components: {
    ListRow,
    PageBody,
    Card,
    EmptyState,
    SearchBox
  },

  props: ['app', 'identity'],

  data: () => ({ filter: '' }),

  computed: {
    // Feeds with something waiting come first: the question this page answers
    // is"what should I open?", not"what am I subscribed to?".
    allFeeds () {
      return this.app.queries.feedsForIdentity(this.identity)
        .slice()
        .sort((a, b) => this.unreadFor(b) - this.unreadFor(a))
    },

    feeds () {
      const filter = this.filter.trim().toLowerCase()

      if (!filter) return this.allFeeds

      return this.allFeeds.filter((feed) => {
        return this.app.queries.titleForFeed(feed).toLowerCase().includes(filter)
      })
    }
  },

  methods: {
    unreadFor (feed) {
      return this.app.queries.unreadEntriesForFeedLength(this.identity, feed)
    },

    // Paused has its own badge on the row, so this line is free to say the same
    // thing it says about every other feed: when something last arrived.
    metaFor (feed) {
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
