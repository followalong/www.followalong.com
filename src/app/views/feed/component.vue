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
      <template #meta>
        <button
          class="rounded-md border border-transparent bg-green-100 px-4 py-2 font-medium text-green-700 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:text-sm"
          :aria-label="`${existingFeed ? 'Unf' : 'F'}ollow ${app.queries.titleForFeed(feed)}`"
          @click="toggleFollow"
        >
          Follow<span v-if="existingFeed">ing</span>
        </button>
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
import SORT_BY_TIME from '../../../queries/sorters/sort-by-time.js'
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

      return (this.remoteFeed.entries || []).sort(SORT_BY_TIME(this.app.queries))
    },

    entries () {
      return this.existingFeed ? this.app.queries.entriesForFeed(this.identity, this.existingFeed) : this.remoteEntries
    }
  },

  mounted () {
    this.fetchFeed()
  },

  methods: {
    toggleFollow () {
      if (this.existingFeed) {
        this.app.commands.removeFeedFromIdentity(this.identity, this.existingFeed)
        this.fetchFeed()
        return
      }

      this.app.commands.addFeedToIdentity(this.identity, this.remoteFeed.url, this.remoteFeed.data, this.remoteFeed.entries.map((e) => e.data))
    },

    fetchFeed () {
      this.remoteFeed = null

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
            entries: entries.map((data) => { return { id: data.id, data } })
          })
        })
    }
  }
}
</script>
