<template>
  <div v-if="!isLoading">
    <!-- Background color split screen for large screens -->
    <div
      class="fixed top-0 left-0 right-0 h-full bg-gray-50"
      aria-hidden="true"
    />
    <div class="flex min-h-screen flex-col">
      <TopBar :app="app" />

      <!-- 3 column wrapper -->
      <div class="w-full max-w-5xl flex-grow lg:flex">
        <!-- Left sidebar & main wrapper -->
        <div class="min-w-0 pl-7 flex-1 bg-white xl:flex">
          <SideBar :app="app" />

          <div
            class="bg-gray-50 lg:min-w-0 lg:flex-1"
            style="margin-left: 14rem"
          >
            <div class="h-full mt-16 py-6 px-4 sm:px-6 lg:px-8">
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

export default {
  components: {
    SideBar,
    TopBar
  },
  props: {
    state: {
      type: Object,
      default: () => new MultiEventStore('follow-along', 'v2.1', runners)
    }
  },
  data () {
    window.followAlong = this
    const queries = new Queries({
      state: this.state
    })
    const commands = new Commands({
      state: this.state,
      queries
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
  mounted () {
    return this.commands.restoreFromLocal().then(() => {
      if (!this.queries.allIdentities().length) {
        this.commands.addIdentity({})
      }

      this.isLoading = false
    })
  }
}
</script>

<style lang="scss">
@import "./index.scss";
</style>
