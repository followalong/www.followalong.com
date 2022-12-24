<template>
  <div v-if="feed">
    <PageTitle :title="app.queries.titleForFeed(feed)">
      <template #description>
        <a
          :href="app.queries.urlForFeed(feed)"
          target="_blank"
        >
          {{ app.queries.urlForFeed(feed) }} &rarr;
        </a>
      </template>
    </PageTitle>

    <FeedEntry
      v-for="entry in app.queries.entriesForIdentity(identity)"
      :app="app"
      :identity="identity"
      :entry="entry"
    />
  </div>
</template>

<script>
import FeedEntry from '../../components/feed-entry/component.vue'
import PageTitle from '../../components/page-title/component.vue'

export default {
  components: {
    FeedEntry,
    PageTitle
  },

  props: ['app', 'identity'],

  computed: {
    feed () {
      return this.app.queries.feedForIdentity(this.identity, this.$route.params.feedUrl.replace(/^feeds\//, ''))
    }
  },

  mounted () {
    if (!this.feed) {
      return 'redirect to public feed'
    }

    this.app.commands.fetchFeed(this.identity, this.feed)
  }
}
</script>
