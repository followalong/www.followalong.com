<template>
  <div v-if="feed || remoteFeed">
    <PageTitle :title="app.queries.titleForFeed(feed)">
      <template #description>
        <a
          :href="app.queries.linkForFeed(feed)"
          target="_blank"
        >
          {{ app.queries.linkForFeed(feed) }} &rarr;
          <span v-if="!remoteFeed">Loading...</span>
        </a>
      </template>
    </PageTitle>

    <FeedEntry
      v-for="entry in entries"
      :key="`entry-${app.queries.keyForEntry(entry)}`"
      :app="app"
      :identity="identity"
      :entry="entry"
      :feed="feed"
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
    existingFeed () {
      return this.app.queries.feedForIdentityByUrl(this.identity, this.url)
    },

    feed () {
      return this.existingFeed || this.remoteFeed
    },

    url () {
      return this.$route.fullPath.replace(/^\/feeds\//, '')
    },

    remoteEntries () {
      if (!this.remoteFeed) {
        return []
      }

      return this.remoteFeed._entries
    },

    entries () {
      return this.existingFeed ? this.app.queries.entriesForFeed(this.identity, this.existingFeed) : this.remoteEntries
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
        const entries = (data.entry || data.item) || []

        delete data.entry
        delete data.item

        this.remoteFeed = Object.assign({}, {
          url: this.url,
          data,
          _entries: entries.map((data) => { return { id: data.id, data } })
        })
      })
  }
}
</script>
