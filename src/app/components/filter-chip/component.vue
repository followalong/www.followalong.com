<template>
  <button
    type="button"
    :aria-pressed="`${selected}`"
    class="min-h-touch inline-flex items-center flex-none"
    @click="$emit('select')"
  >
    <!-- The pill is the size the design draws; the button around it is the
 size a thumb needs. -->
    <span
      :class="`rounded-pill px-3.5 py-1.5 text-chip font-semibold border whitespace-nowrap transition-colors duration-150 ${
        selected
          ? 'bg-primary border-primary text-white'
          : 'border-hairline-outline text-ink-secondary'
      }`"
    >
      <slot />
    </span>
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
