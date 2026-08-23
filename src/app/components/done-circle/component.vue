<template>
  <button
    type="button"
    :aria-pressed="`${done}`"
    :aria-label="`Mark as ${done ? 'unread' : 'read'}${subject ? ` ${subject}` : ''}`"
    :class="`h-7 w-7 flex-none rounded-full border-2 flex items-center justify-center text-sm font-bold ${
      done
        ? 'bg-following border-following text-white'
        : 'border-inactive text-inactive'
    }`"
    @click="$emit('toggle')"
  >
    ✓
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
