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
      <FeedRow
        v-for="feed in feeds"
        :key="feed.id"
        :app="app"
        :identity="identity"
        :feed="feed"
      />
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
import FeedRow from '../../components/feed-row/component.vue'
import PageBody from '../../components/page-body/component.vue'
import Card from '../../components/card/component.vue'
import EmptyState from '../../components/empty-state/component.vue'
import SearchBox from '../../components/search-box/component.vue'

export default {
  components: {
    FeedRow,
    PageBody,
    Card,
    EmptyState,
    SearchBox
  },

  props: ['app', 'identity'],

  data: () => ({ filter: '' }),

  computed: {
    // Alphabetical, which is the only order somebody can predict in a list of
    // a hundred. Ordering by what was waiting moved every other feed whenever
    // one of them published, so the list was never twice the same.
    allFeeds () {
      return this.app.queries.feedsForIdentity(this.identity)
    },

    feeds () {
      const filter = this.filter.trim().toLowerCase()

      if (!filter) return this.allFeeds

      return this.allFeeds.filter((feed) => {
        return this.app.queries.titleForFeed(feed).toLowerCase().includes(filter)
      })
    }
  }
}
</script>
