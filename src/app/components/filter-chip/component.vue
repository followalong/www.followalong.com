<template>
  <button
    type="button"
    :aria-pressed="`${selected}`"
    :class="`rounded-pill px-3.5 py-1.5 text-chip font-semibold border ${
      selected
        ? 'bg-primary border-primary text-white'
        : 'border-hairline-outline text-ink-secondary'
    }`"
    @click="$emit('select')"
  >
    <slot />
  </button>
</template>

<script>
export default {
  props: {
    selected: {
      type: Boolean,
      default: false
    }
  },
  emits: ['select']
}
</script>
