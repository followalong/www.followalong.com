<template>
  <div
    data-search-panel
    class="fixed inset-0 z-50 bg-chrome flex flex-col"
  >
    <div class="flex items-center gap-3 px-4 py-3 md:px-6">
      <button
        type="button"
        aria-label="Close search"
        class="h-[34px] w-[34px] flex-none rounded-full bg-white/10 text-chrome-icon text-base font-bold"
        @click="$emit('close')"
      >
        ←
      </button>

      <form
        aria-label="Search"
        class="flex-1"
        @submit.prevent="$emit('search', q)"
      >
        <SearchBox
          v-model="q"
          scope="global"
          aria-label="Search input"
        />
      </form>
    </div>

    <div class="flex-1 bg-page overflow-y-auto">
      <slot />
    </div>
  </div>
</template>

<script>
import SearchBox from '../search-box/component.vue'

export default {
  components: { SearchBox },
  emits: ['search', 'close'],
  data: () => ({ q: '' })
}
</script>
