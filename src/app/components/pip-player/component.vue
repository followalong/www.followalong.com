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

      <div
        data-pip-frame
        class="relative aspect-video bg-ink"
      >
        <slot />

        <button
          data-pip-menu
          type="button"
          :aria-expanded="`${showHistory}`"
          aria-label="Playback history"
          class="absolute top-2 left-2 h-7 w-7 rounded-full bg-black/45 flex items-center justify-center text-accent"
          @click="showHistory = !showHistory"
        >
          <svg
            class="h-3 w-3"
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

        <button
          data-pip-close
          type="button"
          aria-label="Close player"
          class="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/45 text-white text-field"
          @click="$emit('close')"
        >
          ✕
        </button>

        <button
          data-pip-pause
          type="button"
          aria-label="Pause"
          class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/45 flex items-center justify-center text-white"
          @click="$emit('pause')"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M4.5 2.5h2.5v11H4.5zM9 2.5h2.5v11H9z" />
          </svg>
        </button>

        <span class="absolute inset-x-0 bottom-0 h-0.75 bg-white/25">
          <span
            data-pip-progress
            class="block h-0.75 bg-accent"
            :style="{ width: `${progress}%` }"
          />
        </span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    title: { type: String, default: '' },
    history: { type: Array, default: () => [] },
    nowPlayingId: { type: String, default: '' },
    progress: { type: Number, default: 0 }
  },
  emits: ['pause', 'close', 'select'],
  data: () => ({ showHistory: false })
}
</script>
