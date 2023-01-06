<template>
  <div>
    <PageTitle title="Welcome home!">
      <template #description>
        Sorting by most recent
      </template>
    </PageTitle>

    <FeedEntry
      v-for="entry in app.queries.entriesForIdentity(identity, limit)"
      :key="app.queries.keyForEntry(entry)"
      :app="app"
      :identity="identity"
      :entry="entry"
    />
  </div>
</template>

<script>
import FeedEntry from '../../components/feed-entry/component.vue'
import PageTitle from '../../components/page-title/component.vue'
import PullToRefresh from 'pulltorefreshjs'

const DISTANCE_FROM_BOTTOM = 500
const LIMIT = 4

export default {
  components: {
    FeedEntry,
    PageTitle
  },

  props: ['app', 'identity'],

  data () {
    return {
      limit: LIMIT,
      infiniteScrollListener: this.infiniteScroll()
    }
  },

  beforeMount () {
    if (this.$route.query.feedUrl) {
      return this.$router.push(`/${this.$route.query.feedUrl}`)
    }
  },

  mounted () {
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
