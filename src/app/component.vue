<template>
  <div
    v-if="!isLoading"
    class="min-h-screen flex flex-col bg-page"
  >
    <AppBar
      :title="title"
      :back="back"
    >
      <!-- Desktop is tablet: the same tabs, moved into the bar. -->
      <template #nav>
        <NavTabs
          on="chrome"
          class="hidden md:flex ml-auto"
        />
      </template>

      <template #action>
        <button
          type="button"
          aria-label="Open search"
          class="h-[34px] w-[34px] rounded-full bg-white/10 flex items-center justify-center text-chrome-icon"
          @click="searching = true"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <circle
              cx="9"
              cy="9"
              r="6"
            />
            <path d="M14 14l4 4" />
          </svg>
        </button>
      </template>
    </AppBar>

    <SearchPanel
      v-if="searching"
      @close="searching = false"
      @search="onSearch"
    />

    <main class="flex-1 w-full max-w-app pb-24 md:pb-8">
      <router-view
        :app="app"
        :identity="identity"
        @play="play"
      />
    </main>

    <PipPlayer
      v-if="playing"
      :title="queries.titleForEntry(playing)"
      :history="playHistory"
      :now-playing-id="`${playing.id}`"
      :progress="playProgress"
      @close="playing = null"
      @pause="togglePlayback"
      @select="play(playingEntries[$event.id])"
    >
      <iframe
        v-if="playingIsEmbed"
        :src="playingSrc"
        class="h-full w-full"
        frameborder="0"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      />
      <video
        v-else
        ref="pipVideo"
        :src="playingSrc"
        class="h-full w-full"
        autoplay
        playsinline
        @timeupdate="onPlayProgress"
      />
    </PipPlayer>

    <NavTabs
      on="surface"
      class="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-hairline-strong bg-white pt-3 pb-6"
    />
  </div>
</template>

<script>
import AppBar from './components/app-bar/component.vue'
import NavTabs from './components/nav-tabs/component.vue'
import SearchPanel from './components/search-panel/component.vue'
import PipPlayer from './components/pip-player/component.vue'
import Commands from '../commands/index.js'
import MultiEventStore from '../state/multi-event-store.js'
import VERSION from '../state/version.js'
import runners from '../state/runners.js'
import Queries from '../queries/index.js'
import NoSleep from 'nosleep.js'
import KeychainAdapter from '../adapters/keychain.js'

const POLL_INTERVAL = 30000
let POLL_TIMEOUT

// Every page gets its title and, on a sub-page, its back target from here, so
// the bar stays pixel-identical instead of each view rolling its own header.
const PAGES = {
  '/': { title: 'Home' },
  '/following': { title: 'Feeds you follow' },
  '/marketplace': { title: 'Marketplace' },
  '/settings': { title: 'You' },
  '/help': { title: 'Help', back: '/settings' },
  '/add-ons': { title: 'Add-ons', back: '/settings' }
}

export default {
  components: {
    AppBar,
    NavTabs,
    SearchPanel,
    PipPlayer
  },
  props: {
    state: {
      type: Object,
      default: () => new MultiEventStore('follow-along', VERSION, runners)
    },
    fetch: {
      type: Function,
      default: (url) => window.fetch(url).then((response) => response.text())
    },
    automaticFetch: {
      type: Boolean,
      default: true
    },
    confirm: {
      type: Function,
      default: (question) => {
        return new Promise((resolve, reject) => {
          window.confirm(question) ? resolve() : reject(new Error('Not confirmed'))
        })
      }
    },
    scrollTo: {
      type: Function,
      default: (...args) => window.scrollTo(...args)
    },
    noSleep: {
      type: Object,
      default: () => new NoSleep()
    },
    prompt: {
      type: Function,
      default: (question) => window.prompt(question)
    },
    keychainName: {
      type: String,
      default: KeychainAdapter.DEFAULT_NAME
    },
    // Loaded on demand: the SDK is far larger than the rest of the app, and
    // only identities syncing to a bucket ever need it.
    awsS3: {
      type: Function,
      default: (config) => import('aws-sdk').then((mod) => new (mod.default || mod).S3(config))
    }
  },
  data () {
    window.followAlong = this
    const keychain = new KeychainAdapter({ prompt: this.prompt, name: this.keychainName })
    const queries = new Queries({
      fetch: this.fetch,
      state: this.state,
      awsS3: this.awsS3
    })
    const commands = new Commands({
      fetch: this.fetch,
      state: this.state,
      queries,
      keychain,
      scrollTo: this.scrollTo,
      noSleep: this.noSleep
    })

    return {
      app: this,
      queries,
      commands,
      now: new Date(),
      isLoading: true,
      identity: null,
      pageTitle: '',
      searching: false,
      playing: null,
      playHistory: [],
      playingEntries: {},
      playProgress: 0
    }
  },
  computed: {
    page () {
      return PAGES[this.$route.path] || {}
    },
    title () {
      if (this.page.title) return this.page.title

      // A view showing something the shell cannot look up — a feed that is not
      // followed yet — names the page itself.
      if (this.pageTitle) return this.pageTitle

      const { signal, feedUrl } = this.$route.params

      if (signal) {
        const found = this.queries.signalForIdentity(this.identity, signal)

        return (found && this.queries.titleForSignal(found)) || 'Home'
      }

      if (feedUrl) {
        const feed = this.queries.feedForIdentityByUrl(this.identity, feedUrl)

        return (feed && this.queries.titleForFeed(feed)) || 'Feed'
      }

      return 'Follow Along'
    },
    playingSrc () {
      return this.playing ? this.queries.videoForEntry(this.playing) : ''
    },
    // Anything that is not a plain file has to go in an iframe.
    playingIsEmbed () {
      return !/mp4|ogg/.test(this.playingSrc)
    },
    back () {
      if (this.page.back) return this.page.back

      return this.$route.params.feedUrl ? '/following' : ''
    }
  },
  watch: {
    '$route.path' () {
      this.pageTitle = ''
    },

    identity (val) {
      if (val && this.automaticFetch) {
        setTimeout(() => this.pollFeeds(), 10)
      }
    }
  },
  mounted () {
    return this.commands.restoreFromLocal()
      .then(() => this.commands.restoreFromRemote())
      .then(() => {
        if (!this.queries.allIdentities().length) {
          this.commands.addIdentity({})
        }

        this.isLoading = false
        this.setIdentity(this.queries.allIdentities()[0])
      })
  },
  methods: {
    pollFeeds () {
      clearTimeout(POLL_TIMEOUT)

      return this.commands.fetchOutdatedFeeds(this.identity).then(() => {
        POLL_TIMEOUT = setTimeout(() => this.pollFeeds(), POLL_INTERVAL)
      })
    },
    // The window outlives the page it was started from, so the entry and its
    // history live on the shell rather than in any one view.
    play (entry) {
      this.playingEntries[entry.id] = entry
      this.playProgress = 0
      this.playing = entry
      this.playHistory = [
        { id: `${entry.id}`, title: this.queries.titleForEntry(entry), duration: '' },
        ...this.playHistory.filter((item) => item.id !== `${entry.id}`)
      ].slice(0, 6)
    },

    togglePlayback () {
      const video = this.$refs.pipVideo

      if (!video) return

      video.paused ? video.play() : video.pause()
    },

    onPlayProgress (event) {
      const { currentTime, duration } = event.target

      this.playProgress = duration ? (currentTime / duration) * 100 : 0
    },

    onSearch (q) {
      this.searching = false
      this.search(q)
    },

    search (q) {
      if (q.toLowerCase().indexOf('http') !== -1) {
        this.$router.push(`/${q}`)
      }
    },
    setIdentity (identity) {
      this.identity = identity
    }
  }
}
</script>

<style lang="scss">
@import "./index.scss";
</style>
