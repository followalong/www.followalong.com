<template>
  <component
    :is="as"
    data-card
    :class="`border-y md:border md:rounded-card ${TONES[tone]} ${padded ? 'p-4 md:p-5' : 'overflow-hidden'}`"
  >
    <slot />
  </component>
</template>

<script>
// The one surface in the app. Full-bleed on a phone, rounded from tablet up —
// there were eight hand-written variants of this before, differing in border
// and radius for no reason anyone chose.
const TONES = {
  default: 'bg-white border-hairline-strong',
  danger: 'bg-danger-bg border-danger-border',
  success: 'bg-following-bg border-following-border'
}

export default {
  props: {
    tone: {
      type: String,
      default: 'default',
      validator: (value) => Object.keys(TONES).includes(value)
    },
    // Off when the card holds its own rows, which bring their own padding.
    padded: { type: Boolean, default: true },
    as: { type: String, default: 'section' }
  },
  data: () => ({ TONES })
}
</script>
