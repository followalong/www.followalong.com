<template>
  <article :class="`bg-white border-b md:border border-hairline rounded-none md:rounded-card overflow-hidden ${done ? 'opacity-70' : ''}`">
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
        <span class="h-11 w-11 rounded-full bg-ink flex items-center justify-center text-white">
          <svg
            class="h-5 w-5 ml-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M7 5v10l8-5z" />
          </svg>
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
            class="block w-full text-left py-1 -my-1"
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
        <div class="flex items-start gap-1 flex-none">
          <SaveStar
            v-if="savable"
            :saved="saved"
            :subject="subject"
            @toggle="$emit('save')"
          />
          <DoneCircle
            :done="done"
            :subject="subject"
            @toggle="$emit('done')"
          />
        </div>
      </div>

      <component
        :is="readable ? 'button' : 'div'"
        v-if="summary"
        data-summary
        :type="readable ? 'button' : undefined"
        class="block w-full text-left mt-2.5 text-body md:text-sm text-ink-body"
        @click="readable && $emit('read')"
      >
        {{ summary }}
        <span
          v-if="summaryLabel"
          data-summary-badge
          class="align-middle ml-1 inline-block rounded-pill bg-accent-tint px-2 py-0.5 text-micro font-bold uppercase tracking-wider text-accent-ink whitespace-nowrap"
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
            class="h-play w-play flex-none rounded-full bg-ink flex items-center justify-center text-white"
            aria-label="Play"
            @click="$emit('play')"
          >
            <svg
              class="h-icon w-icon ml-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M7 5v10l8-5z" />
            </svg>
          </button>
          <span class="flex-1 h-1 rounded-sm bg-inactive-track">
            <span
              data-progress-fill
              class="block h-1 rounded-sm bg-accent"
              :style="{ width: `${progress}%` }"
            />
          </span>
          <span class="text-tiny text-ink-muted">{{ elapsed }}</span>
        </div>
      </slot>
    </div>
  </article>
</template>

<script>
import DoneCircle from '../done-circle/component.vue'
import SaveStar from '../save-star/component.vue'

export default {
  components: { DoneCircle, SaveStar },
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
    saved: { type: Boolean, default: false },
    savable: { type: Boolean, default: false },
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
  emits: ['done', 'save', 'play', 'read']
}
</script>
