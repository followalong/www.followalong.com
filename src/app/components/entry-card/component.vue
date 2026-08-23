<template>
  <article class="bg-white border-y md:border border-hairline rounded-none md:rounded-card overflow-hidden">
    <slot name="lead">
      <button
        v-if="media === 'video'"
        data-media-lead
        type="button"
        class="w-full aspect-video bg-surface-sunken bg-cover bg-center flex items-center justify-center"
        :style="poster ? { backgroundImage: `url(${poster})` } : null"
        aria-label="Play"
        @click="$emit('play')"
      >
        <span class="h-11 w-11 rounded-full bg-ink flex items-center justify-center">
          <span class="ml-1 border-y-[9px] border-y-transparent border-l-[14px] border-l-white" />
        </span>
      </button>
    </slot>

    <div class="px-4 py-3.5 md:px-5 md:py-4">
      <div class="flex justify-between gap-2.5">
        <div class="min-w-0">
          <component
            :is="readable ? 'button' : 'div'"
            :type="readable ? 'button' : undefined"
            :aria-label="readable && subject ? `Toggle entry content ${subject}` : undefined"
            class="block w-full text-left"
            @click="readable && $emit('read')"
          >
            <h2
              aria-label="Entry title"
              class="text-card md:text-card-lg font-bold text-ink"
              v-html="title"
            />
          </component>
          <p class="text-meta text-ink-muted mt-1">
            <slot name="meta">
              {{ meta }}
            </slot>
          </p>
        </div>
        <DoneCircle
          :done="done"
          :subject="subject"
          @toggle="$emit('done')"
        />
      </div>

      <component
        :is="readable ? 'button' : 'div'"
        v-if="summary"
        data-summary
        :type="readable ? 'button' : undefined"
        class="block w-full text-left mt-2.5 text-body md:text-[14px] text-ink-body"
        @click="readable && $emit('read')"
      >
        {{ summary }}
        <span
          v-if="summaryLabel"
          data-summary-badge
          class="align-middle ml-1 inline-block rounded-pill bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-ink whitespace-nowrap"
        >{{ summaryLabel }}</span>
      </component>

      <slot name="player">
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
      </slot>
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
      validator: (value) => ['text', 'video', 'audio', 'image'].includes(value)
    },
    done: { type: Boolean, default: false },
    progress: { type: Number, default: 0 },
    elapsed: { type: String, default: '' },
    // Names the entry, so the card's controls stay distinct on a long river.
    subject: { type: String, default: '' },
    // Whether there is a full text worth opening the reader for.
    readable: { type: Boolean, default: false },
    // Thumbnail behind the video lead's play button.
    poster: { type: String, default: '' },
    // Badge after the summary; only earned when an add-on wrote it.
    summaryLabel: { type: String, default: '' }
  },
  emits: ['done', 'play', 'read']
}
</script>
