<template>
  <nav
    class="top-bar flex-shrink-0 fixed top-0 left-0 right-0 z-40"
  >
    <div class="max-w-5xl px-2 sm:px-4 md:px-8">
      <div class="flex h-16 items-center justify-between">
        <!-- Logo section -->
        <div class="flex items-center px-2 md:px-0 md:w-64">
          <router-link
            to="/"
            class="db flex-shrink-0"
          >
            <img
              class="h-8 w-auto md:hidden"
              src="../../../assets/imgs/logo-mobile.svg"
              alt="Follow Along"
            >
            <img
              class="h-8 w-auto hidden md:block"
              src="../../../assets/imgs/logo-white.svg"
              alt="Follow Along"
            >
          </router-link>
        </div>
        <div class="flex flex-1 justify-center md:justify-end">
          <form
            class="w-full"
            aria-label="Search"
            @submit.prevent="search"
          >
            <label
              for="search"
              class="sr-only"
            >Search...</label>
            <div class="relative text-indigo-200 focus-within:text-gray-400">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  class="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <input
                id="search"
                v-model="q"
                name="search"
                class="block w-full rounded-md border border-transparent bg-indigo-400 bg-opacity-25 py-2 pl-10 pr-3 leading-5 text-indigo-100 placeholder-indigo-200 focus:bg-white focus:text-gray-900 focus:placeholder-gray-400 focus:outline-none focus:ring-0"
                placeholder="Search or RSS URL..."
                type="search"
                aria-label="Search input"
              >
            </div>
          </form>
        </div>
        <div
          class="flex md:hidden"
        >
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md p-2 text-white"
            aria-controls="mobile-menu"
            aria-expanded="false"
            @click="showMenu = !showMenu"
          >
            <svg
              v-if="!showMenu"
              class="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
            </svg>
            <svg
              v-else
              class="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
    <div
      v-if="showMenu"
      id="mobile-menu"
      class="md:hidden"
    >
      <div
        class="fixed top-0 mt-16 bottom-0 bg-white p-4 pb-16 h-full w-full overflow-auto"
        @click="showMenu = false"
      >
        <NavLinks
          :app="app"
          :identity="identity"
        />
      </div>
    </div>
  </nav>
</template>

<script>
import NavLinks from '../nav-links/component.vue'

export default {
  components: {
    NavLinks
  },
  props: ['app', 'identity'],
  data () {
    return {
      q: '',
      showMenu: false
    }
  },
  methods: {
    search () {
      this.app.search(this.q)
    }
  }
}
</script>
