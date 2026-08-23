<template>
  <button
    type="button"
    :aria-pressed="`${saved}`"
    :aria-label="`${saved ? 'Unsave' : 'Save'}${subject ? ` ${subject}` : ''}`"
    :class="`h-7 w-7 flex-none flex items-center justify-center ${saved ? 'text-accent' : 'text-inactive'}`"
    @click="$emit('toggle')"
  >
    <svg
      class="h-[18px] w-[18px]"
      viewBox="0 0 20 20"
      :fill="saved ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M5.5 3.25h9a.75.75 0 01.75.75v12.4a.4.4 0 01-.62.34L10 13.6l-4.63 3.14a.4.4 0 01-.62-.34V4a.75.75 0 01.75-.75z" />
    </svg>
  </button>
</template>

<script>
export default {
  props: {
    saved: { type: Boolean, default: false },
    // Names what is being saved, so several stars on one page stay distinct.
    subject: { type: String, default: '' }
  },
  emits: ['toggle']
}
</script>
