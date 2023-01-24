<template>
  <div class="flex items-center justify-between sm:ml-6 sm:flex-shrink-0 sm:justify-start">
    <div class="relative ml-3 inline-block text-left">
      <div>
        <button
          id="menu-0-button"
          type="button"
          class="-my-2 flex items-center rounded-full bg-white p-2 text-gray-400 hover:text-gray-600"
          :aria-expanded="isOpen"
          aria-haspopup="true"
          aria-label="Show menu"
          @click="toggleOpen"
        >
          <span class="sr-only">Open options</span>
          <!-- Heroicon name: mini/ellipsis-vertical -->
          <svg
            class="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
          </svg>
        </button>
      </div>

      <div
        v-if="isOpen"
        class="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="menu-0-button"
        tabindex="-1"
      >
        <div
          class="py-1"
          role="none"
        >
          <slot name="items" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: ['app', 'identity'],

  data () {
    return {
      isOpen: false
    }
  },

  methods: {
    toggleOpen () {
      this.isOpen = !this.isOpen
    }
  }
}
</script>
