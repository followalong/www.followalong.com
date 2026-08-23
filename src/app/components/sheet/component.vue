<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="opacity-0"
  >
    <div
      v-if="open"
      data-sheet-scrim
      class="fixed inset-0 z-50 bg-chrome/70 flex flex-col justify-end items-center"
      @click.self="$emit('close')"
    >
      <Transition
        appear
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-4 opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="translate-y-4 opacity-0"
      >
        <section
          ref="sheet"
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
      </Transition>
    </div>
  </Transition>
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
  data: () => ({ opener: null }),
  watch: {
    open: {
      immediate: true,
      handler (value) {
        this.lockPage(value)

        if (value) {
          this.opener = document.activeElement
          this.$nextTick(() => this.takeFocus())
          document.addEventListener('keydown', this.onKey)
          return
        }

        document.removeEventListener('keydown', this.onKey)
        this.restoreFocus()
      }
    }
  },
  unmounted () {
    this.lockPage(false)
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    // A dialog that does not take focus leaves a keyboard somewhere behind it,
    // and Escape bound to the scrim only fired if the scrim happened to hold
    // focus — which it never did.
    takeFocus () {
      const sheet = this.$refs.sheet

      if (!sheet) return

      const first = sheet.querySelector('input, textarea, select, [data-sheet-close]')

      if (first) first.focus()
    },

    restoreFocus () {
      if (this.opener && this.opener.focus) this.opener.focus()

      this.opener = null
    },

    onKey (event) {
      if (event.key === 'Escape') this.$emit('close')
    },

    // Without this the page behind scrolls under the sheet, which detaches
    // the sticky bar and loses your place in the river.
    lockPage (locked) {
      if (typeof document === 'undefined') return

      document.body.style.overflow = locked ? 'hidden' : ''
    }
  }
}
</script>
