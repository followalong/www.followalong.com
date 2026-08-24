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
      class="fixed inset-y-0 left-0 w-full max-w-app z-50 bg-chrome/70 flex flex-col justify-end"
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
          :style="dragStyle"
          class="bg-surface-sheet rounded-t-sheet max-h-sheet w-full flex flex-col px-5 pt-3.5"
        >
          <!-- The bar is 4px tall, which is nothing to aim a thumb at, so the
 grab area is the full width of the sheet and the padding either side of it.
 The negative margins keep that off the layout. touch-none stops the browser
 claiming the gesture as a scroll before the handler sees it. -->
          <div
            data-sheet-handle
            class="-mx-5 -my-2 px-5 py-2 touch-none cursor-grab active:cursor-grabbing"
            @pointerdown="startDrag"
            @pointermove="onDrag"
            @pointerup="endDrag"
            @pointercancel="cancelDrag"
          >
            <div
              data-sheet-grabber
              class="mx-auto h-1 w-9 rounded-sm bg-inactive-track"
              aria-hidden="true"
            />
          </div>

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
// Distance alone decides, with no velocity rule. Reading a clock would mean
// mocking one in a spec, and mocking Date.now stops Vue delivering events at
// all: it stamps every handler with the time it was attached and drops any
// event whose timeStamp predates that, so a frozen clock makes every event
// look stale. A swipe worth calling a swipe clears this anyway.
const CLOSE_DISTANCE = 72
const SETTLE_MS = 160

export default {
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
    // Reading content sits on a measure rather than the sheet's full width.
    narrow: { type: Boolean, default: false }
  },
  emits: ['close'],
  data: () => ({ opener: null, dragging: false, settling: false, from: 0, offset: 0 }),
  computed: {
    // Only while the sheet is being moved by hand. An inline transform that
    // outlived the drag would beat the leave transition's own translate and
    // the sheet would vanish instead of sliding out.
    dragStyle () {
      if (!this.dragging && !this.settling) return undefined

      return {
        transform: `translateY(${this.offset}px)`,
        transition: this.dragging ? 'none' : 'transform 150ms ease-out'
      }
    }
  },

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
    clearTimeout(this.settleTimer)
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

    startDrag (event) {
      this.dragging = true
      this.settling = false
      this.from = event.clientY
      this.offset = 0

      // Keeps the moves coming if the finger leaves the handle, which it does
      // immediately — the handle is 20px tall and the gesture is ten times it.
      if (event.target.setPointerCapture && event.pointerId !== undefined) {
        event.target.setPointerCapture(event.pointerId)
      }
    },

    onDrag (event) {
      if (!this.dragging) return

      // Down only. Dragging up would lift the sheet off the bottom edge and
      // show the page through the gap.
      this.offset = Math.max(0, event.clientY - this.from)
    },

    endDrag () {
      if (!this.dragging) return

      if (this.offset > CLOSE_DISTANCE) {
        this.dragging = false
        this.offset = 0
        this.$emit('close')
        return
      }

      this.settle()
    },

    // A drag the browser takes over — a system gesture, a pointer that went
    // away — must put the sheet back rather than strand it mid-screen.
    cancelDrag () {
      if (this.dragging) this.settle()
    },

    settle () {
      this.dragging = false
      this.settling = true
      this.offset = 0

      clearTimeout(this.settleTimer)
      this.settleTimer = setTimeout(() => { this.settling = false }, SETTLE_MS)
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
