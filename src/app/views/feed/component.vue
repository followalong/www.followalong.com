<template>
  <div v-if="feed || remoteFeed">
    <PageTitle :title="app.queries.titleForFeed(feed)">
      <template #description>
        <a
          :href="app.queries.urlForFeed(feed)"
          target="_blank"
        >
          {{ app.queries.urlForFeed(feed) }} &rarr;
          <span v-if="!remoteFeed">Loading...</span>
        </a>
      </template>
    </PageTitle>

    <FeedEntry
      v-for="entry in entries"
      :key="`entry-${entry.id}`"
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

  data () {
    return {
      remoteFeed: null
    }
  },

  computed: {
    feed () {
      return this.app.queries.feedForIdentityByUrl(this.identity, this.url) || this.remoteFeed
    },

    url () {
      return this.$route.params.feedUrl.replace(/^feeds\//, '')
    },

    entries () {
      return this.feed ? this.app.queries.entriesForFeed(this.identity, this.feed) : this.remoteFeed.entry || []
    }
  },

  mounted () {
    if (this.feed) {
      return this.app.commands.fetchFeed(this.identity, this.feed)
        .then(() => {
          this.remoteFeed = true
        })
    }

    this.app.commands.fetchUrl(this.url)
      .then((data) => {
        this.remoteFeed = { data }
      })
  }
}
</script>
