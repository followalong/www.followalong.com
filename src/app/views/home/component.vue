<template>
  <div class="feed home-feed wide-feed">
    <div class="relativizer">
      <a
        v-if="newItemsCount"
        href="javascript:;"
        aria-label="Show new items"
        class="new-item-notification"
        @click="app.commands.showNewItems(app.identity)"
      >
        You have {{ newItemsCount }} new {{ newItemsCountWord }}!&nbsp; <u>Show {{ newItemsCountWord }}.</u>
      </a>
    </div>

    <div class="title-wrapper">
      <button
        v-if="hasUnreadItems"
        class="button-gray button-small float-right"
        aria-label="Catch up on all"
        @click="app.commands.catchMeUp(app.identity, items)"
      >
        Catch Me Up!
      </button>
      <h1>{{ mediaVerb ? capitalize(mediaVerb) : 'What\'s New?' }}</h1>
    </div>

    <ul
      v-if="itemsWithLimit.length"
      class="items"
    >
      <Item
        v-for="item in itemsWithLimit"
        :key="item.id"
        :item="item"
        :app="app"
        show-content="true"
      />
    </ul>

    <p
      v-else
      class="highlight"
    >
      You're all caught up!
    </p>
  </div>
</template>

<script>
import Item from '@/app/components/item/component.vue'
import PullToRefresh from 'pulltorefreshjs'

const VERBS = ['watch', 'read', 'listen']
const DISTANCE_FROM_BOTTOM = 500
const LIMIT = 4

export default {
  components: {
    Item
  },
  props: ['app'],
  data () {
    return {
      limit: LIMIT,
      infiniteScrollListener: this.infiniteScroll()
    }
  },
  computed: {
    items () {
      let items = this.app.queries.itemsForIdentity(this.app.identity)

      if (this.mediaVerb === 'watch') {
        items = items.filter(this.app.queries.isWatchable)
      } else if (this.mediaVerb === 'listen') {
        items = items.filter(this.app.queries.isListenable)
      } else if (this.mediaVerb === 'read') {
        items = items.filter(this.app.queries.isReadable)
      }

      items = items.filter(this.app.queries.isNotNew)

      return items
    },
    itemsWithLimit () {
      return this.items.slice(0, this.limit)
    },
    hasUnreadItems () {
      return this.items.filter(this.app.queries.isUnread).length
    },
    mediaVerb () {
      var verb = this.$route.params.media_verb

      if (VERBS.indexOf(verb) === -1) {
        return
      }

      return verb
    },
    newItemsCount () {
      return this.app.queries.newItemsCount(this.app.identity)
    },
    newItemsCountWord () {
      return this.newItemsCount === 1 ? 'item' : 'items'
    }
  },
  watch: {
    mediaVerb () {
      this.limit = LIMIT
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
    capitalize (str) {
      return str[0].toUpperCase() + str.slice(1, str.length)
    },

    startPullToRefresh () {
      PullToRefresh.init({
        mainElement: 'body',
        onRefresh: () => {
          setTimeout(() => this.app.commands.fetchAllFeeds(this.app.identity), 1500)
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
