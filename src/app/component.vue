<template>
  <div
    v-if="!isLoading"
    class="min-h-screen w-full max-w-app flex flex-col bg-page"
  >
    <AppBar
      :title="title"
      :back="back"
    >
      <template #action>
        <!-- A page that has actions of its own hands the shell a way to open
 them; the bar outlives the page, so the page takes it back on the way out. -->
        <button
          v-if="pageMenu"
          type="button"
          aria-label="Feed menu"
          class="h-touch w-touch flex items-center justify-center text-chrome-icon"
          @click="pageMenu()"
        >
          <span class="h-slot w-slot rounded-full bg-white/10 flex items-center justify-center">
            <svg
              class="h-4 w-4"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M3 6h14M3 10h14M3 14h14" />
            </svg>
          </span>
        </button>

        <button
          type="button"
          aria-label="Open search"
          class="h-touch w-touch -mr-2 flex items-center justify-end text-chrome-icon"
          @click="searching = true"
        >
          <span class="h-slot w-slot rounded-full bg-white/10 flex items-center justify-center">
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
          </span>
        </button>
      </template>
    </AppBar>

    <SearchPanel
      v-if="searching"
      :app="app"
      :identity="identity"
      @close="searching = false"
      @search="onSearch"
    />

    <main class="flex-1 w-full pb-24">
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

    <Sheet
      :open="!!handoff"
      title="Set up this device"
      @close="handoff = null"
    >
      <p class="text-body text-ink-secondary">
        This code came from another device that is backing up to
        {{ handoff && handoff.d && handoff.d.bucket }}. Setting up reads that
        backup and makes this device the same identity.
      </p>

      <p
        v-if="handoffError"
        class="mt-3 text-body text-danger"
      >
        {{ handoffError }}
      </p>

      <template #footer>
        <Button
          class="flex-1"
          aria-label="Set it up"
          @click="setUp"
        >
          {{ settingUp ? 'Setting up…' : 'Set it up' }}
        </Button>
      </template>
    </Sheet>

    <!-- One nav, in one place, whatever the screen. -->
    <NavTabs
      on="surface"
      class="fixed bottom-0 left-0 w-full max-w-app z-30 border-t border-hairline-strong bg-white pt-3 pb-6"
    />
  </div>
</template>

<script>
import AppBar from './components/app-bar/component.vue'
import NavTabs from './components/nav-tabs/component.vue'
import SearchPanel from './components/search-panel/component.vue'
import PipPlayer from './components/pip-player/component.vue'
import Sheet from './components/sheet/component.vue'
import Button from './components/button/component.vue'
import { decodeHandoff } from '../queries/handoff.js'
import Commands from '../commands/index.js'
import MultiEventStore from '../state/multi-event-store.js'
import VERSION from '../state/version.js'
import runners from '../state/runners.js'
import Queries from '../queries/index.js'
import NoSleep from 'nosleep.js'
import KeychainAdapter from '../adapters/keychain.js'
import buildFetch from '../adapters/fetch.js'
import loadAwsSdk from '../adapters/aws-sdk.js'

const POLL_INTERVAL = 5 * 60 * 1000
let POLL_TIMEOUT

// Every page gets its title and, on a sub-page, its back target from here, so
// the bar stays pixel-identical instead of each view rolling its own header.
const PAGES = {
  '/': { title: 'Follow Along' },
  '/following': { title: 'Feeds you follow' },
  '/marketplace': { title: 'Marketplace' },
  '/settings': { title: 'You' },
  '/help': { title: 'Help', back: '/settings' },
  '/about': { title: 'About', back: '/settings' },
  '/add-ons': { title: 'Add-ons', back: '/settings' }
}

export default {
  components: {
    AppBar,
    NavTabs,
    SearchPanel,
    PipPlayer,
    Sheet,
    Button
  },
  props: {
    state: {
      type: Object,
      default: () => new MultiEventStore('follow-along', VERSION, runners)
    },
    fetch: {
      type: Function,
      default: buildFetch((url, options) => window.fetch(url, options))
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
    copyToClipboard: {
      type: Function,
      default: (text) => navigator.clipboard.writeText(text)
    },
    keychainName: {
      type: String,
      default: KeychainAdapter.DEFAULT_NAME
    },
    // Handed in by main.js, which takes it off the URL before the first
    // navigation can lose it.
    handoffHash: {
      type: String,
      default: ''
    },
    // Loaded on demand: the SDK is far larger than the rest of the app, and
    // only identities syncing to a bucket ever need it.
    awsS3: {
      type: Function,
      default: (config) => loadAwsSdk().then((AWS) => new AWS.S3(config))
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
      noSleep: this.noSleep,
      copyToClipboard: this.copyToClipboard
    })

    return {
      app: this,
      queries,
      commands,
      now: new Date(),
      isLoading: true,
      identity: null,
      pageTitle: '',
      pageMenu: null,
      searching: false,
      handoff: decodeHandoff(this.handoffHash),
      handoffError: '',
      settingUp: false,
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
        const title = found && this.queries.titleForSignal(found)

        // "Home" beside a house-shaped logo says nothing, so the default
        // river carries the app's name. A signal someone renamed keeps theirs.
        if (!title || title === 'Home') return 'Follow Along'

        return title
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
  // The device already holds everything, so the bucket is asked behind the
  // painted app rather than in front of it. Waiting on the network to confirm
  // a copy that is already here bought nothing and cost the whole load.
  mounted () {
    return this.commands.restoreFromLocal()
      .then(() => {
        if (!this.queries.allIdentities().length) {
          this.commands.addIdentity({})
        }

        this.isLoading = false
        this.setIdentity(this.queries.allIdentities()[0])

        // Merging re-folds the log, which replaces every projection object,
        // and the identity held here is one of them.
        return this.commands.restoreFromRemote()
          .then(() => this.setIdentity(this.queries.allIdentities()[0]))
      })
  },
  methods: {
    // The code carries the bucket's credentials, so it leaves the address bar
    // the moment it has been used.
    setUp () {
      this.settingUp = true
      this.handoffError = ''

      return this.commands.setUpFromHandoff(this.handoff)
        .then((identity) => {
          this.handoff = null
          this.setIdentity(identity)

          return this.$router.replace('/')
        })
        .catch((e) => { this.handoffError = e.message })
        .then(() => { this.settingUp = false })
    },

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
@import"./index.scss";
</style>
