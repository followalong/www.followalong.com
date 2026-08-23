<template>
  <div v-if="feed || remoteFeed">
    <NewBar
      :app="app"
      :identity="identity"
      :entries="existingEntries"
    />

    <header class="px-4 pt-4 md:px-6 border-b border-hairline-strong">
      <div class="flex items-center gap-3">
        <img
          v-if="app.queries.imageForFeed(feed)"
          :src="app.queries.imageForFeed(feed)"
          class="h-11 w-11 rounded-[11px] flex-none"
          alt=""
        >
        <div class="min-w-0">
          <h2 class="text-lg font-bold text-ink truncate">
            {{ title }}
          </h2>
          <a
            :href="app.queries.linkForFeed(feed)"
            target="_blank"
            class="text-meta text-primary"
          >
            {{ app.queries.linkForFeed(feed) }} &rarr;
            <span v-if="!remoteFeed">Loading...</span>
          </a>
        </div>
      </div>

      <div class="flex items-center gap-2 mt-3">
        <button
          type="button"
          :aria-label="`${existingFeed ? 'Unf' : 'F'}ollow ${app.queries.titleForFeed(feed)}`"
          :class="`rounded-pill px-3 py-1.5 text-chip font-semibold ${
            existingFeed
              ? 'bg-following-bg text-following'
              : 'bg-primary text-white'
          }`"
          @click="toggleFollow"
        >
          Follow<span v-if="existingFeed">ing</span>
        </button>

        <button
          v-if="existingFeed && unreadEntries.length"
          type="button"
          aria-label="Catch up on feed"
          class="rounded-pill border border-hairline-outline px-3 py-1.5 text-chip font-semibold text-ink-body"
          @click="catchUpOnFeed"
        >
          Catch me up
        </button>

        <button
          v-if="existingFeed"
          type="button"
          :aria-label="`${app.queries.isFeedPaused(existingFeed) ? 'Unp' : 'P'}ause feed`"
          class="rounded-pill border border-hairline-outline px-3 py-1.5 text-chip font-semibold text-ink-body"
          @click="togglePause"
        >
          {{ app.queries.isFeedPaused(existingFeed) ? 'Unp' : 'P' }}ause
        </button>
      </div>

      <SearchBox
        v-model="filter"
        scope="scoped"
        :hint="`${entries.length} items`"
        class="my-3"
      />
    </header>

    <FeedEntry
      v-for="entry in entries"
      :key="`feed-${feed.id}-entry-${entry.id}`"
      :app="app"
      :identity="identity"
      :entry="entry"
      :feed="feed"
    />
  </div>
</template>

<script>
import FeedEntry from '../../components/feed-entry/component.vue'
import NewBar from '../../components/new-bar/component.vue'
import SearchBox from '../../components/search-box/component.vue'

export default {
  components: {
    FeedEntry,
    NewBar,
    SearchBox
  },

  props: ['app', 'identity'],

  data () {
    return {
      remoteFeed: null,
      filter: ''
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
      // fullPath, not the param, so a feed URL keeps its query string — but
      // only while the feed route is the one matched.
      if (!this.$route.params.feedUrl) return ''

      return this.$route.fullPath.replace(/^\//, '')
    },

    remoteEntries () {
      if (!this.remoteFeed) {
        return []
      }

      return this.app.queries.sortEntriesByTime(this.remoteFeed.entries || [])
    },

    existingEntries () {
      return this.existingFeed ? this.app.queries.entriesForFeed(this.identity, this.existingFeed) : []
    },

    entries () {
      if (!this.existingFeed) {
        return this.remoteEntries
      }

      return this.app.queries.filterNonNewEntries(
        this.identity,
        this.existingEntries
      )
    },

    unreadEntries () {
      return this.app.queries.unreadEntries(this.existingEntries)
    },

    title () {
      if (!this.feed) return ''

      let title = this.app.queries.titleForFeed(this.feed)

      if (this.app.queries.isFeedPaused(this.feed)) {
        title += ' ⏸︎'
      }

      return title
    }
  },

  watch: {
    title: {
      immediate: true,
      handler (value) {
        this.app.pageTitle = value
      }
    },

    // Leaving the feed route empties the url; there is nothing to fetch then.
    url (value) {
      if (value) this.fetchFeed()
    }
  },

  mounted () {
    this.app.commands.showNewEntries(this.identity)
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
      this.app.commands.showNewEntries(this.identity)
    },

    togglePause () {
      if (this.app.queries.isFeedPaused(this.existingFeed)) {
        this.app.commands.unpauseFeedForIdentity(this.identity, this.existingFeed)
        return
      }

      this.app.commands.pauseFeedForIdentity(this.identity, this.existingFeed)
    },

    catchUpOnFeed () {
      this.unreadEntries.reverse().forEach((entry) => {
        this.app.commands.markEntryAsReadForIdentity(this.identity, entry)
      })
    },

    fetchFeed () {
      this.remoteFeed = null

      if (this.feed) {
        return this.app.commands.fetchFeed(this.identity, this.feed)
          .then((a) => {
            this.remoteFeed = true
          })
      }

      this.app.commands.fetchUrl(this.identity, 'rss', this.url)
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
