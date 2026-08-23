<template>
  <div
    v-if="open"
    data-sheet-scrim
    class="fixed inset-0 z-50 bg-chrome/70 flex flex-col justify-end items-center"
    tabindex="-1"
    @click.self="$emit('close')"
    @keydown.esc="$emit('close')"
  >
    <section
      data-sheet
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      class="bg-surface-sheet rounded-t-sheet max-h-sheet w-full max-w-app flex flex-col px-5 pt-3.5"
    >
      <div
        data-sheet-grabber
        class="mx-auto h-1 w-9 rounded-sm bg-inactive-track"
        aria-hidden="true"
      />

      <!-- A reading sheet keeps its title, body and actions on one measure,
           so the column does not start in three different places. -->
      <div :class="`flex-1 min-h-0 flex flex-col ${narrow ? 'w-full max-w-read mx-auto' : ''}`">
        <header class="flex items-center gap-2.5 mt-4">
          <h2 class="flex-1 text-lg font-bold text-ink truncate">
            {{ title }}
          </h2>
          <button
            data-sheet-close
            type="button"
            aria-label="Close"
            class="h-touch w-touch -mr-3 text-ink-subtle text-card"
            @click="$emit('close')"
          >
            ✕
          </button>
        </header>

        <div class="flex-1 overflow-y-auto py-2">
          <slot />
        </div>

        <footer
          v-if="$slots.footer"
          class="flex gap-2.5 py-4 pb-7"
        >
          <slot name="footer" />
        </footer>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
    // Reading content sits on a measure rather than the sheet's full width.
    narrow: { type: Boolean, default: false }
  },
  emits: ['close'],
  watch: {
    open: {
      immediate: true,
      handler (value) {
        this.lockPage(value)
      }
    }
  },
  unmounted () {
    this.lockPage(false)
  },
  methods: {
    // Without this the page behind scrolls under the sheet, which detaches
    // the sticky bar and loses your place in the river.
    lockPage (locked) {
      if (typeof document === 'undefined') return

      document.body.style.overflow = locked ? 'hidden' : ''
    }
  }
}
</script>
