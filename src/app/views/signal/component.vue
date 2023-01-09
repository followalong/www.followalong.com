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
    </PageTitle>

    <FeedEntry
      v-for="entry in shownEntries"
      :key="app.queries.keyForEntry(entry)"
      :app="app"
      :identity="identity"
      :entry="entry"
    />
  </div>
</template>

<script>
import FeedEntry from '../../components/feed-entry/component.vue'
import NewBar from '../../components/new-bar/component.vue'
import PageTitle from '../../components/page-title/component.vue'
import PullToRefresh from 'pulltorefreshjs'

const DISTANCE_FROM_BOTTOM = 500
const LIMIT = 4

export default {
  components: {
    FeedEntry,
    NewBar,
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
    }
  }
}
</script>
