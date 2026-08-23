<template>
  <button
    type="button"
    :class="`rounded-lg px-4 py-2.5 text-body font-semibold border transition-colors duration-150 active:scale-98 ${VARIANTS[variant]} ${block ? 'w-full' : ''}`"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script>
// Three variants only. A fourth belongs in the inventory first, not here.
const VARIANTS = {
  primary: 'bg-primary border-primary text-white',
  secondary: 'bg-transparent border-hairline-outline text-ink-body',
  destructive: 'bg-danger-bg border-danger-border text-danger'
}

export default {
  props: {
    variant: {
      type: String,
      default: 'primary',
      validator: (value) => Object.keys(VARIANTS).includes(value)
    },
    block: {
      type: Boolean,
      default: false
    }
  },
  emits: ['click'],
  data: () => ({ VARIANTS })
}
</script>
