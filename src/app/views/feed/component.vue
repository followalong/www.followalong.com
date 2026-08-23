<template>
  <div v-if="feed || remoteFeed">
    <NewBar
      :app="app"
      :identity="identity"
      :entries="existingEntries"
    />

    <header class="flex flex-col gap-4 px-4 py-4 border-b border-hairline-strong">
      <div class="flex items-center gap-3">
        <img
          v-if="app.queries.imageForFeed(feed)"
          :src="app.queries.imageForFeed(feed)"
          class="h-11 w-11 rounded-avatar flex-none"
          alt=""
        >
        <a
          :href="app.queries.linkForFeed(feed)"
          target="_blank"
          class="min-w-0 flex-1 text-meta text-primary truncate"
        >
          {{ app.queries.linkForFeed(feed) }} &rarr;
          <span v-if="!remoteFeed && !fetchError">Loading...</span>
        </a>
        <button
          type="button"
          aria-label="Copy feed URL"
          class="flex-none h-slot rounded-pill border border-hairline-outline px-3 text-chip font-semibold text-ink-body"
          @click="copyUrl"
        >
          {{ copiedUrl ? 'Copied' : 'Copy' }}
        </button>
      </div>

      <p
        v-if="fetchError"
        role="status"
        class="rounded-card border border-danger-border bg-danger-bg px-3 py-2 text-meta text-danger"
      >
        {{ fetchError }}
      </p>

      <div class="flex items-center gap-2">
        <button
          type="button"
          :aria-label="`${existingFeed ? 'Unf' : 'F'}ollow ${app.queries.titleForFeed(feed)}`"
          :class="`h-slot rounded-pill px-4 text-chip font-semibold ${
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
          class="h-slot rounded-pill border border-hairline-outline px-4 text-chip font-semibold text-ink-body"
          @click="catchUpOnFeed"
        >
          Catch me up
        </button>

        <button
          v-if="existingFeed"
          type="button"
          :aria-label="`${app.queries.isFeedPaused(existingFeed) ? 'Unp' : 'P'}ause feed`"
          class="h-slot rounded-pill border border-hairline-outline px-4 text-chip font-semibold text-ink-body"
          @click="togglePause"
        >
          {{ app.queries.isFeedPaused(existingFeed) ? 'Unp' : 'P' }}ause
        </button>
      </div>

      <SearchBox
        v-model="filter"
        scope="scoped"
        :hint="`${entries.length} items`"
      />
    </header>

    <div class="flex flex-col gap-0">
      <FeedEntry
        v-for="entry in entries"
        :key="`entry-${entry.id}`"
        :app="app"
        :identity="identity"
        :entry="entry"
        :feed="feed"
        @play="$emit('play', $event)"
      />
    </div>
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

  emits: ['play'],

  data () {
    return {
      remoteFeed: null,
      liveFetchError: null,
      filter: '',
      copiedUrl: false
    }
  },

  computed: {
    // A followed feed keeps its last failure in the store, so the reason it is
    // empty survives a reload; an unfollowed one has only this visit to go on.
    fetchError () {
      return this.liveFetchError || this.app.queries.fetchErrorForFeed(this.existingFeed)
    },

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

    allEntries () {
      if (!this.existingFeed) {
        return this.remoteEntries
      }

      return this.app.queries.filterNonNewEntries(
        this.identity,
        this.existingEntries
      )
    },

    entries () {
      const needle = this.filter.trim().toLowerCase()

      if (!needle) return this.allEntries

      return this.allEntries.filter((entry) => {
        return `${this.app.queries.titleForEntry(entry)}`.toLowerCase().includes(needle)
      })
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
    copyUrl () {
      return Promise.resolve(this.app.commands.copyToClipboard(this.url || this.app.queries.urlForFeed(this.feed)))
        .then(() => { this.copiedUrl = true })
        .catch(() => {})
    },

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
      this.liveFetchError = null

      if (this.feed) {
        return this.app.commands.fetchFeed(this.identity, this.feed)
          .then((a) => {
            this.remoteFeed = true
          })
          .catch((e) => {
            this.liveFetchError = e.message
          })
      }

      this.app.commands.fetchUrl(this.identity, 'rss', this.url)
        .then(({ data }) => {
          const entries = (data.entry || data.item) || []

          delete data.entry
          delete data.item

          this.remoteFeed = Object.assign({}, {
            url: this.url,
            data,
            entries: entries.map((data) => { return { id: data.id, data } })
          })
        })
        .catch((e) => {
          this.liveFetchError = e.message
        })
    }
  }
}
</script>
