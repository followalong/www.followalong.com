<template>
  <article class="bg-white border-y md:border border-hairline rounded-none md:rounded-card overflow-hidden">
    <button
      v-if="media === 'video'"
      data-media-lead
      type="button"
      class="w-full aspect-video bg-surface-sunken flex items-center justify-center"
      aria-label="Play"
      @click="$emit('play')"
    >
      <span class="h-11 w-11 rounded-full bg-ink flex items-center justify-center">
        <span class="ml-1 border-y-[9px] border-y-transparent border-l-[14px] border-l-white" />
      </span>
    </button>

    <div class="px-4 py-3.5 md:px-5 md:py-4">
      <div class="flex justify-between gap-2.5">
        <div class="min-w-0">
          <h2 class="text-card md:text-card-lg font-bold text-ink">
            {{ title }}
          </h2>
          <p class="text-meta text-ink-muted mt-1">
            {{ meta }}
          </p>
        </div>
        <DoneCircle
          :done="done"
          @toggle="$emit('done')"
        />
      </div>

      <p
        v-if="summary"
        class="mt-2.5 text-body md:text-[14px] text-ink-body"
      >
        {{ summary }}
        <span class="text-[11px] font-semibold text-accent-ink">SUMMARY</span>
      </p>

      <div
        v-if="media === 'audio'"
        class="mt-2.5 flex items-center gap-2.5 bg-surface-sunken rounded-pill px-3 py-1.5"
      >
        <button
          data-play
          type="button"
          class="h-[26px] w-[26px] flex-none rounded-full bg-ink flex items-center justify-center"
          aria-label="Play"
          @click="$emit('play')"
        >
          <span class="ml-0.5 border-y-[5px] border-y-transparent border-l-[9px] border-l-white" />
        </button>
        <span class="flex-1 h-1 rounded-sm bg-inactive-track">
          <span
            data-progress-fill
            class="block h-1 rounded-sm bg-accent"
            :style="{ width: `${progress}%` }"
          />
        </span>
        <span class="text-[11px] text-ink-muted">{{ elapsed }}</span>
      </div>

      <button
        v-if="summary"
        data-read-full
        type="button"
        class="mt-3 text-body font-semibold text-primary"
        @click="$emit('read')"
      >
        Read full
      </button>
    </div>
  </article>
</template>

<script>
import DoneCircle from '../done-circle/component.vue'

export default {
  components: { DoneCircle },
  props: {
    title: { type: String, required: true },
    meta: { type: String, default: '' },
    summary: { type: String, default: '' },
    media: {
      type: String,
      default: 'text',
      validator: (value) => ['text', 'video', 'audio'].includes(value)
    },
    done: { type: Boolean, default: false },
    progress: { type: Number, default: 0 },
    elapsed: { type: String, default: '' }
  },
  emits: ['done', 'play', 'read']
}
</script>
