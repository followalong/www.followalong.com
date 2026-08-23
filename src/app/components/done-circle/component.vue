<template>
  <button
    type="button"
    :aria-pressed="`${done}`"
    :aria-label="`Mark as ${done ? 'unread' : 'read'}${subject ? ` ${subject}` : ''}`"
    :class="`h-touch w-touch -my-2 flex-none flex items-center justify-center transition-colors duration-150 ${done ? 'text-following' : 'text-inactive'}`"
    @click="$emit('toggle')"
  >
    <!-- Every icon on a card is an 18px glyph on a 20-unit viewBox, stroked at
 1.75 — the ring is drawn here rather than being the button's border, so
 this and the SaveStar beside it carry the same weight. -->
    <svg
      class="h-icon w-icon"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="10"
        cy="10"
        r="8"
        :fill="done ? 'currentColor' : 'none'"
      />
      <path
        d="M6.3 10.4l2.5 2.5 5-5.4"
        :stroke="done ? '#fff' : 'currentColor'"
      />
    </svg>
  </button>
</template>

<script>
export default {
  props: {
    done: {
      type: Boolean,
      default: false
    },
    // Names what is being marked, so several circles on one page stay distinct.
    subject: {
      type: String,
      default: ''
    }
  },
  emits: ['toggle']
}
</script>
