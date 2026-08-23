<template>
  <div
    data-pip
    class="fixed right-3 bottom-[100px] md:right-5 md:bottom-5 z-40 w-[310px] md:w-[460px] rounded-xl overflow-hidden shadow-2xl"
  >
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
          :class="`flex-1 min-w-0 truncate text-left text-[11.5px] ${
            item.id === nowPlayingId ? 'text-white font-semibold' : 'text-chrome-icon'
          }`"
          @click="$emit('select', item)"
        >
          {{ item.title }}
        </button>
        <span
          v-if="item.id === nowPlayingId"
          class="text-[10px] text-accent flex-none"
        >▶ now</span>
        <span
          v-else
          class="text-[10px] text-chrome-muted flex-none"
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
        class="absolute top-2 left-2 h-7 w-7 rounded-full bg-black/45 flex flex-col items-center justify-center gap-[2.5px]"
        @click="showHistory = !showHistory"
      >
        <span
          v-for="line in 3"
          :key="line"
          class="w-3 h-0.5 rounded-sm bg-accent"
        />
      </button>

      <button
        data-pip-close
        type="button"
        aria-label="Close player"
        class="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/45 text-white text-[13px]"
        @click="$emit('close')"
      >
        ✕
      </button>

      <button
        data-pip-pause
        type="button"
        aria-label="Pause"
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/45 flex items-center justify-center gap-[3px]"
        @click="$emit('pause')"
      >
        <span
          v-for="bar in 2"
          :key="bar"
          class="w-[3px] h-[13px] rounded-sm bg-white"
        />
      </button>

      <span class="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
        <span
          data-pip-progress
          class="block h-[3px] bg-accent"
          :style="{ width: `${progress}%` }"
        />
      </span>
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
