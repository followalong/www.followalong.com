<template>
  <div>
    <NewBar
      :app="app"
      :identity="identity"
      :entries="existingEntries"
    />

    <header class="flex flex-col gap-4 px-4 py-4 border-b border-hairline-strong">
      <p
        v-if="fetchError"
        role="status"
        class="rounded-card border border-danger-border bg-danger-bg px-3 py-2 text-meta text-danger"
      >
        {{ fetchError }}
      </p>

      <SearchBox
        v-if="feed || remoteFeed"
        v-model="filter"
        scope="scoped"
        :hint="`${entries.length} items`"
      />
    </header>

    <Sheet
      :open="menuOpen"
      :title="menuTitle"
      @close="menuOpen = false"
    >
      <Card :padded="false">
        <ListRow
          v-if="feed || remoteFeed"
          :title="existingFeed ? 'Following' : 'Follow'"
          :meta="existingFeed ? 'tap to unfollow' : 'add it to your feeds'"
          action
          :aria-label="`${existingFeed ? 'Unf' : 'F'}ollow ${app.queries.titleForFeed(feed)}`"
          @click="toggleFollow"
        >
          <template #trailing>
            <span />
          </template>
        </ListRow>
        <ListRow
          title="Fetch now"
          :meta="fetchMeta"
          action
          aria-label="Fetch feed"
          @click="fetchNow"
        >
          <template #trailing>
            <span />
          </template>
        </ListRow>
        <ListRow
          v-if="existingFeed && unreadEntries.length"
          title="Catch me up"
          :meta="`${unreadEntries.length} unread`"
          action
          aria-label="Catch up on feed"
          @click="catchUpOnFeed"
        >
          <template #trailing>
            <span />
          </template>
        </ListRow>
        <ListRow
          v-if="existingFeed"
          :title="`${app.queries.isFeedPaused(existingFeed) ? 'Unp' : 'P'}ause`"
          :meta="app.queries.isFeedPaused(existingFeed) ? 'not being checked' : 'stop checking it'"
          action
          :aria-label="`${app.queries.isFeedPaused(existingFeed) ? 'Unp' : 'P'}ause feed`"
          @click="togglePause"
        >
          <template #trailing>
            <span />
          </template>
        </ListRow>
        <ListRow
          title="Copy URL"
          :meta="copiedUrl ? 'Copied' : url"
          action
          aria-label="Copy feed URL"
          @click="copyUrl"
        >
          <template #trailing>
            <span />
          </template>
        </ListRow>
      </Card>
    </Sheet>

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
import Sheet from '../../components/sheet/component.vue'
import Card from '../../components/card/component.vue'
import ListRow from '../../components/list-row/component.vue'

export default {
  components: {
    FeedEntry,
    NewBar,
    SearchBox,
    Sheet,
    Card,
    ListRow
  },

  props: ['app', 'identity'],

  emits: ['play'],

  data () {
    return {
      remoteFeed: null,
      liveFetchError: null,
      filter: '',
      copiedUrl: false,
      menuOpen: false,
      fetching: false
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

    // Before the fetch answers there is no feed to name, and a link someone
    // shared may never produce one, so the address itself is the fallback.
    link () {
      return this.app.queries.linkForFeed(this.feed) || this.url
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

    menuTitle () {
      return this.feed ? this.app.queries.titleForFeed(this.feed) : 'This feed'
    },

    fetchMeta () {
      if (this.fetching) return 'checking...'
      if (this.fetchError) return 'last try failed'

      return this.checkedAgo()
    },

    unreadEntries () {
      return this.app.queries.unreadEntries(this.existingEntries)
    },

    // The address is the fallback name, because a link someone shared may
    // never produce a feed to name and the bar is the only thing left saying
    // which one failed.
    title () {
      if (!this.feed) return this.url

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
    this.app.pageMenu = this.openMenu
    this.app.commands.showNewEntries(this.identity)
    this.fetchFeed()
  },

  // The bar belongs to the shell and outlives this page, so a menu left
  // behind would open a sheet for a feed nobody is looking at.
  unmounted () {
    this.app.pageMenu = null
  },

  methods: {
    openMenu () {
      this.menuOpen = true
    },

    copyUrl () {
      return Promise.resolve(this.app.commands.copyToClipboard(this.url || this.app.queries.urlForFeed(this.feed)))
        .then(() => { this.copiedUrl = true })
        .catch(() => {})
    },

    checkedAgo () {
      const at = this.existingFeed && this.app.queries.lastUpdatedForFeed(this.existingFeed)

      if (!at) return 'never checked'

      const seconds = Math.max(0, Math.round((Date.now() - at) / 1000))

      if (seconds < 60) return 'checked just now'
      if (seconds < 3600) return `checked ${Math.round(seconds / 60)} min ago`

      return `checked ${new Date(at).toLocaleString()}`
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

    // Whatever arrives is shown rather than held behind the new-items bar. The
    // bar exists so a background poll cannot move the page under someone who
    // is reading it; a reader who just asked for the new items is the one case
    // where that protection reads as the button having done nothing.
    fetchNow () {
      return Promise.resolve(this.fetchFeed())
        .then(() => this.app.commands.showNewEntries(this.identity))
    },

    // Deliberately never consults the backoff that the poll respects: asking
    // by hand is what a reader does about a feed that has stopped answering,
    // and a feed that has stopped answering is the one in backoff.
    fetchFeed () {
      this.remoteFeed = null
      this.liveFetchError = null
      this.fetching = true

      if (this.feed) {
        return this.app.commands.fetchFeed(this.identity, this.feed)
          .then(() => { this.remoteFeed = true })
          .catch((e) => { this.liveFetchError = e.message })
          .then(() => { this.fetching = false })
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
        .then(() => { this.fetching = false })
    }
  }
}
</script>
