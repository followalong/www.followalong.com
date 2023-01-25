<template>
  <div>
    <NewBar
      :app="app"
      :identity="identity"
      :entries="entries"
    />

    <PageTitle :title="app.queries.titleForSignal(signal)">
      <template #description>
        {{ app.queries.descriptionForSignal(signal) }}
      </template>

      <template #meta>
        <DropDown
          v-if="unreadEntries.length"
          :app="app"
          :identity="identity"
        >
          <template #items>
            <a
              v-if="unreadEntries.length"
              href="javascript:;"
              class="text-gray-700 flex justify-between px-4 py-2 text-sm"
              role="menuitem"
              tabindex="-1"
              aria-label="Catch up on signal"
              @click="catchUpOnSignal"
            >
              <span>Catch me up</span>
            </a>
          </template>
        </DropDown>
      </template>
    </PageTitle>

    <div v-if="shownEntries.length">
      <FeedEntry
        v-for="entry in shownEntries"
        :key="app.queries.keyForEntry(entry)"
        :app="app"
        :identity="identity"
        :entry="entry"
      />
    </div>

    <div v-else>
      <PageCard>
        <template #title>
          <div class="prose">
            <p>
              It looks like you've seen all there is to see here!
            </p>
          </div>
        </template>
      </PageCard>
    </div>
  </div>
</template>

<script>
import DropDown from '../../components/drop-down/component.vue'
import FeedEntry from '../../components/feed-entry/component.vue'
import PageCard from '../../components/page-card/component.vue'
import NewBar from '../../components/new-bar/component.vue'
import PageTitle from '../../components/page-title/component.vue'
import PullToRefresh from 'pulltorefreshjs'

const DISTANCE_FROM_BOTTOM = 500
const LIMIT = 4

export default {
  components: {
    DropDown,
    FeedEntry,
    NewBar,
    PageCard,
    PageTitle
  },

  props: ['app', 'identity'],

  data () {
    return {
      limit: LIMIT,
      infiniteScrollListener: this.infiniteScroll()
    }
  },

  computed: {
    signal () {
      return this.app.queries.signalForIdentity(this.identity, this.$route.params.signal)
    },

    entries () {
      return this.app.queries.entriesForSignal(this.identity, this.signal)
    },

    shownEntries () {
      return this.app.queries.filterNonNewEntries(this.entries).slice(0, this.limit)
    },

    unreadEntries () {
      return this.shownEntries.filter((e) => !this.app.queries.isEntryRead(e))
    }
  },

  watch: {
    signal () {
      this.app.commands.showNewEntries()
    }
  },

  mounted () {
    this.app.commands.showNewEntries()
    window.addEventListener('scroll', this.infiniteScrollListener)
    this.startPullToRefresh()
  },

  unmounted () {
    window.removeEventListener('scroll', this.infiniteScrollListener)
    this.endPullToRefresh()
  },

  methods: {
    startPullToRefresh () {
      PullToRefresh.init({
        mainElement: 'body',
        onRefresh: () => {
          setTimeout(() => this.app.commands.fetchFeedsForIdentity(this.identity), 100)
        }
      })
    },

    endPullToRefresh () {
      PullToRefresh.destroyAll()
    },

    infiniteScroll () {
      let LOADING

      return () => {
        if (LOADING) {
          return
        }

        const documentHeight = document.body.scrollHeight
        const windowHeight = window.innerHeight || document.documentElement.clientHeight
        const windowScrolled = Math.max(window.pageYOffset || 0, document.documentElement.scrollTop)

        if (documentHeight - windowScrolled - windowHeight < DISTANCE_FROM_BOTTOM) {
          this.limit += LIMIT

          setTimeout(function () {
            LOADING = false
          }, 100)
        }
      }
    },

    catchUpOnSignal () {
      this.unreadEntries.reverse().forEach((entry) => {
        this.app.commands.markEntryAsReadForIdentity(this.identity, entry)
      })
      this.app.commands.showNewEntries()
    }
  }
}
</script>
