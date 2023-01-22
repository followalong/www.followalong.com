<template>
  <div v-if="!isLoading">
    <!-- Background color split screen for large screens -->
    <div
      class="fixed top-0 left-0 right-0 h-full bg-gray-50"
      aria-hidden="true"
    />
    <div class="flex min-h-screen flex-col">
      <TopBar
        :app="app"
        :identity="identity"
      />

      <!-- 3 column wrapper -->
      <div class="w-full max-w-5xl flex-grow md:flex">
        <!-- Left sidebar & main wrapper -->
        <div class="min-w-0 md:pl-7 flex-1 bg-white md:flex">
          <SideBar
            :app="app"
            :identity="identity"
            class="hidden md:block"
          />

          <div
            class="bg-gray-50 md:min-w-0 md:flex-1 md:ml-sidebar"
          >
            <div class="h-full mt-16 md:py-6 md:px-8">
              <!-- Start main area-->
              <div
                class="relative h-full"
                style="min-height: 36rem"
              >
                <router-view
                  :app="app"
                  :identity="identity"
                />
              </div>
              <!-- End main area -->
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SideBar from './components/side-bar/component.vue'
import TopBar from './components/top-bar/component.vue'
import Commands from '../commands/index.js'
import MultiEventStore from '../state/multi-event-store.js'
import runners from '../state/runners.js'
import Queries from '../queries/index.js'
import NoSleep from 'nosleep.js'

const POLL_INTERVAL = 15000
let POLL_TIMEOUT

export default {
  components: {
    SideBar,
    TopBar
  },
  props: {
    state: {
      type: Object,
      default: () => new MultiEventStore('follow-along', 'v2.1', runners)
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
    window: {
      type: Object,
      default () { return window }
    },
    noSleep: {
      type: Function,
      default () { return new NoSleep() }
    }
  },
  data () {
    window.followAlong = this
    const queries = new Queries({
      state: this.state,
      lastBackgroundFetch: Date.now()
    })
    const commands = new Commands({
      fetch: this.fetch,
      state: this.state,
      queries,
      window
    })

    return {
      app: this,
      queries,
      commands,
      now: new Date(),
      isLoading: true
    }
  },
  computed: {
    identity () {
      return this.queries.allIdentities()[0]
    }
  },
  watch: {
    identity (val) {
      if (val && this.automaticFetch) {
        setTimeout(() => this.pollFeeds(), 100)
      }
    }
  },
  mounted () {
    return this.commands.restoreFromLocal().then(() => {
      if (!this.queries.allIdentities().length) {
        this.commands.addIdentity({})
      }

      this.isLoading = false
    })
  },
  methods: {
    pollFeeds () {
      clearTimeout(POLL_TIMEOUT)

      return this.commands.fetchOutdatedFeeds(this.identity).then(() => {
        POLL_TIMEOUT = setTimeout(() => this.pollFeeds(), POLL_INTERVAL)
      })
    },
    search (q) {
      q = q.toLowerCase()

      if (q.indexOf('http') !== -1) {
        this.$router.push(`/${q}`)
      }
    }
  }
}
</script>

<style lang="scss">
@import "./index.scss";
</style>
