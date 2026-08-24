<template>
  <div
    data-search-panel
    class="fixed inset-y-0 left-0 w-full max-w-app z-50 bg-chrome flex flex-col"
  >
    <div class="w-full flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        aria-label="Close search"
        class="h-slot w-slot flex-none rounded-full bg-white/10 text-chrome-icon text-base font-bold"
        @click="$emit('close')"
      >
        ←
      </button>

      <form
        aria-label="Search"
        class="flex-1"
        @submit.prevent="$emit('search', q)"
      >
        <SearchBox
          v-model="q"
          scope="global"
          aria-label="Search input"
        />
      </form>
    </div>

    <div class="flex-1 bg-page overflow-y-auto">
      <div>
        <p
          v-if="!q.trim()"
          class="px-4 py-5 text-body text-ink-secondary"
        >
          Paste an RSS URL to follow something new, or type to search the feeds
          and entries you already have.
        </p>

        <template v-else>
          <template v-if="looksLikeUrl">
            <h2 :class="HEADING">
              Feed found at this URL
            </h2>
            <ListRow
              :title="q.trim()"
              meta="Open this feed"
              :to="`/${q.trim()}`"
              @click="$emit('close')"
            />
          </template>

          <template v-if="matchingFeeds.length">
            <h2 :class="HEADING">
              Your feeds
            </h2>
            <ListRow
              v-for="feed in matchingFeeds"
              :key="`search-feed-${feed.id}`"
              :title="app.queries.titleForFeed(feed)"
              :meta="`${app.queries.entriesForFeed(identity, feed).length} items`"
              :to="`/${app.queries.urlForFeed(feed)}`"
              @click="$emit('close')"
            />
          </template>

          <template v-if="matchingEntries.length">
            <h2 :class="HEADING">
              In your entries
            </h2>
            <ListRow
              v-for="entry in matchingEntries"
              :key="`search-entry-${entry.id}`"
              :title="app.queries.titleForEntry(entry)"
              :meta="metaFor(entry)"
              :to="feedPathFor(entry)"
              @click="$emit('close')"
            />
          </template>

          <p
            v-if="!looksLikeUrl && !matchingFeeds.length && !matchingEntries.length"
            class="px-4 py-5 text-body text-ink-secondary"
          >
            Nothing matches “{{ q.trim() }}”. Paste an RSS URL to follow something
            new.
          </p>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import SearchBox from '../search-box/component.vue'
import ListRow from '../list-row/component.vue'

const HEADING = 'px-4 pt-5 pb-2 text-tiny font-bold tracking-widest uppercase text-ink-subtle'
const LIMIT = 20

export default {
  components: { SearchBox, ListRow },
  props: {
    app: { type: Object, default: null },
    identity: { type: Object, default: null }
  },
  emits: ['search', 'close'],
  data: () => ({ q: '', HEADING }),
  computed: {
    needle () {
      return this.q.trim().toLowerCase()
    },

    looksLikeUrl () {
      return /^https?:\/\//.test(this.needle) || /^[^\s]+\.[^\s]{2,}/.test(this.needle)
    },

    feeds () {
      if (!this.app || !this.identity) return []

      return this.app.queries.feedsForIdentity(this.identity) || []
    },

    matchingFeeds () {
      return this.feeds.filter((feed) => {
        return `${this.app.queries.titleForFeed(feed)}`.toLowerCase().includes(this.needle)
      })
    },

    // Stops at the twentieth match rather than titling all of them first: a
    // keystroke used to read every entry title in the identity to throw all
    // but twenty away.
    matchingEntries () {
      if (!this.app || !this.identity) return []

      const entries = this.app.queries.entriesForIdentity(this.identity) || []
      const found = []

      for (let i = 0; i < entries.length && found.length < LIMIT; i++) {
        const title = `${this.app.queries.titleForEntry(entries[i])}`.toLowerCase()

        if (title.includes(this.needle)) found.push(entries[i])
      }

      return found
    }
  },
  methods: {
    feedFor (entry) {
      return this.app.queries.feedForIdentity(this.identity, entry.feedId)
    },

    feedPathFor (entry) {
      const feed = this.feedFor(entry)

      return feed ? `/${this.app.queries.urlForFeed(feed)}` : ''
    },

    metaFor (entry) {
      const feed = this.feedFor(entry)
      const title = feed ? `${this.app.queries.titleForFeed(feed)} · ` : ''

      return `${title}${this.app.queries.niceDateForEntry(entry)}`
    }
  }
}
</script>
