<template>
  <button
    type="button"
    :aria-pressed="`${done}`"
    :aria-label="done ? 'Mark as not done' : 'Mark as done'"
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
    }
  },
  emits: ['toggle']
}
</script>
