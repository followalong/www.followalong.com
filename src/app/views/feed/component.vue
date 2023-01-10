<template>
  <div v-if="feed || remoteFeed">
    <NewBar
      :app="app"
      :identity="identity"
      :entries="existingEntries"
    />

    <PageTitle :title="title">
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
        <div class="flex">
          <button
            class="rounded-md border border-transparent bg-green-100 px-4 py-2 font-medium text-green-700 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:text-sm ml-1"
            :aria-label="`${existingFeed ? 'Unf' : 'F'}ollow ${app.queries.titleForFeed(feed)}`"
            @click="toggleFollow"
          >
            Follow<span v-if="existingFeed">ing</span>
          </button>
          <DropDown
            v-if="existingFeed"
            :app="app"
            :identity="identity"
          >
            <template #items>
              <a
                href="javascript:;"
                class="text-gray-700 flex justify-between px-4 py-2 text-sm"
                role="menuitem"
                tabindex="-1"
                :aria-label="`${app.queries.isFeedPaused(existingFeed) ? 'Unp' : 'P'}ause feed`"
                @click="togglePause"
              >
                <span>{{ app.queries.isFeedPaused(existingFeed) ? 'Unp' : 'P' }}ause Feed</span>
              </a>
            </template>
          </DropDown>
        </div>
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
import NewBar from '../../components/new-bar/component.vue'
import PageTitle from '../../components/page-title/component.vue'
import DropDown from '../../components/drop-down/component.vue'

export default {
  components: {
    DropDown,
    FeedEntry,
    NewBar,
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
      return this.$route.fullPath.replace(/^\//, '')
    },

    remoteEntries () {
      if (!this.remoteFeed) {
        return []
      }

      return (this.remoteFeed.entries || []).sort(SORT_BY_TIME(this.app.queries))
    },

    existingEntries () {
      return this.existingFeed ? this.app.queries.entriesForFeed(this.identity, this.existingFeed) : []
    },

    entries () {
      if (!this.existingFeed) {
        return this.remoteEntries
      }

      return this.app.queries.filterNonNewEntries(
        this.existingEntries
      )
    },

    title () {
      let title = this.app.queries.titleForFeed(this.feed)

      if (this.app.queries.isFeedPaused(this.feed)) {
        title += ' ⏸︎'
      }

      return title
    }
  },

  watch: {
    url () {
      this.fetchFeed()
    }
  },

  mounted () {
    this.app.commands.showNewEntries()
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
      this.app.commands.showNewEntries()
    },

    togglePause () {
      if (this.app.queries.isFeedPaused(this.existingFeed)) {
        this.app.commands.unpauseFeedForIdentity(this.identity, this.existingFeed)
        return
      }

      this.app.commands.pauseFeedForIdentity(this.identity, this.existingFeed)
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
