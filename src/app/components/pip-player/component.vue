<template>
  <div
    data-pip
    class="fixed bottom-tab-bar left-0 w-full max-w-app z-40 px-3 flex justify-end pointer-events-none"
  >
    <div class="w-pip rounded-xl overflow-hidden shadow-2xl pointer-events-auto">
      <div
        v-if="showHistory"
        data-pip-history
        class="bg-chrome-deep px-2.5 py-0.5"
      >
        <div
          v-for="item in history"
          :key="item.id"
          data-pip-history-item
          :class="`flex items-center gap-2 py-1.5 px-0.5 border-t border-white/[0.07] first:border-t-0 ${
            item.id === nowPlayingId ? '' : 'opacity-65'
          }`"
        >
          <button
            type="button"
            :class="`flex-1 min-w-0 truncate text-left text-tiny ${
              item.id === nowPlayingId ? 'text-white font-semibold' : 'text-chrome-icon'
            }`"
            @click="$emit('select', item)"
          >
            {{ item.title }}
          </button>
          <span
            v-if="item.id === nowPlayingId"
            class="text-micro text-accent flex-none"
          >▶ now</span>
          <span
            v-else
            class="text-micro text-chrome-muted flex-none"
          >{{ item.duration }}</span>
        </div>
      </div>

      <!-- The bar names what is playing and gets you out of it. Transport is
           whatever is playing: a <video> carries the browser's own control and
           an embed brings its own, and neither can be driven from here. -->
      <div class="bg-ink flex items-center gap-1 px-1.5 py-1">
        <button
          data-pip-menu
          type="button"
          :aria-expanded="`${showHistory}`"
          aria-label="Playback history"
          class="h-8 w-8 flex-none flex items-center justify-center text-accent"
          @click="showHistory = !showHistory"
        >
          <svg
            class="h-3.5 w-3.5"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M1.5 2.5h9M1.5 6h9M1.5 9.5h9" />
          </svg>
        </button>

        <span class="flex-1 min-w-0 truncate text-tiny text-chrome-muted px-1">
          {{ title }}
        </span>

        <button
          data-pip-close
          type="button"
          aria-label="Close player"
          class="h-8 w-8 flex-none flex items-center justify-center text-white text-field"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>

      <div
        data-pip-frame
        class="relative aspect-video bg-ink"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    title: { type: String, default: '' },
    history: { type: Array, default: () => [] },
    nowPlayingId: { type: String, default: '' }
  },
  emits: ['close', 'select'],
  data: () => ({ showHistory: false })
}
</script>
