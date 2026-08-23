<template>
  <div>
    <NewBar
      :app="app"
      :identity="identity"
      :entries="entries"
    />

    <SignalChips
      :app="app"
      :identity="identity"
      :current="$route.params.signal"
    >
      <template #end>
        <FilterChip
          v-if="unreadEntries.length"
          aria-label="Catch up on signal"
          class="flex-none ml-auto"
          @select="catchUpOnSignal"
        >
          Catch me up
        </FilterChip>
      </template>
    </SignalChips>

    <section
      v-if="showIntro"
      class="md:px-6 md:pt-5 max-w-river md:mx-auto"
    >
      <div class="bg-white border-y md:border border-hairline md:rounded-card p-4 md:p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-card md:text-card-lg font-bold text-ink">
            What is Follow Along?
          </h2>
          <button
            type="button"
            aria-label="Dismiss intro"
            class="h-7 w-7 -mt-1 -mr-1 flex-none text-ink-subtle"
            @click="dismissIntro"
          >
            ✕
          </button>
        </div>
        <p class="text-body md:text-[14px] text-ink-secondary mt-1.5">
          A place to follow the things you care about directly, with nothing in
          between. Everything stays on this device.
        </p>
        <router-link
          to="/about"
          aria-label="About Follow Along"
          class="inline-block mt-3 text-body font-semibold text-primary"
        >
          Read more &raquo;
        </router-link>
      </div>
    </section>

    <div
      v-if="app.queries.signalHasCards(signal)"
      class="md:px-6 md:py-5 flex flex-col gap-0 md:gap-3.5 max-w-river md:mx-auto"
    >
      <article
        v-for="card in signalCards"
        :key="`signal-${signal.id}-card-${card.title}`"
        class="bg-white border-y md:border border-hairline md:rounded-card p-4 md:p-5"
      >
        <h2 class="text-card md:text-card-lg font-bold text-ink">
          {{ card.title }}
        </h2>
        <p
          v-if="card.description"
          class="text-meta text-ink-muted mt-1"
        >
          {{ card.description }}
        </p>
        <div
          v-if="card.content"
          class="prose mt-3"
          v-html="card.content"
        />
      </article>
    </div>

    <div
      v-else-if="shownEntries.length"
      class="md:px-6 md:py-5 flex flex-col gap-0 md:gap-3.5 max-w-river md:mx-auto"
    >
      <FeedEntry
        v-for="entry in shownEntries"
        :key="`signal-${signal.id}-entry-${entry.id}`"
        :app="app"
        :identity="identity"
        :entry="entry"
        @play="$emit('play', $event)"
      />
    </div>

    <p
      v-else-if="!signalCards.length"
      class="p-4 md:p-6 text-body text-ink-secondary"
    >
      You're all caught up!
    </p>
  </div>
</template>

<script>
import FeedEntry from '../../components/feed-entry/component.vue'
import NewBar from '../../components/new-bar/component.vue'
import SignalChips from '../../components/signal-chips/component.vue'
import FilterChip from '../../components/filter-chip/component.vue'
import PullToRefresh from 'pulltorefreshjs'

const DISTANCE_FROM_BOTTOM = 500
const LIMIT = 4

export default {
  components: {
    FeedEntry,
    FilterChip,
    NewBar,
    SignalChips
  },

  props: ['app', 'identity'],

  emits: ['play'],

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
      return this.app.queries.filterNonNewEntries(this.identity, this.entries).slice(0, this.limit)
    },

    unreadEntries () {
      return this.app.queries.unreadEntries(this.shownEntries)
    },

    catchUpEntries () {
      return this.app.queries.unreadEntries(this.entries)
    },

    showIntro () {
      return this.app.queries.hintIsShown(this.identity, 'intro')
    },

    signalCards () {
      return this.app.queries.cardsForIdentityForSignal(this.identity, this.signal)
    }
  },

  watch: {
    signal () {
      this.limit = LIMIT
      this.app.commands.showNewEntries(this.identity)
    }
  },

  mounted () {
    this.app.commands.showNewEntries(this.identity)
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

    dismissIntro () {
      this.app.commands.hideHintForIdentity(this.identity, 'intro')
    },

    catchUpOnSignal () {
      this.catchUpEntries.reverse().forEach((entry) => {
        this.app.commands.markEntryAsReadForIdentity(this.identity, entry)
      })
      this.app.commands.showNewEntries(this.identity)
    }
  }
}
</script>
