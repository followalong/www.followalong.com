<template>
  <div
    data-page-body
    :class="`flex flex-col ${WIDTHS[width]} ${gapless ? 'gap-0' : 'gap-4'}`"
  >
    <slot />
  </div>
</template>

<script>
// Every page sat on the same column and repeated the same six classes to say
// so. Desktop is tablet, so nothing here grows past the app width.
const WIDTHS = {
  river: '',
  app: 'max-w-app',
  panel: ''
}

export default {
  props: {
    width: {
      type: String,
      default: 'river',
      validator: (value) => Object.keys(WIDTHS).includes(value)
    },
    // Cards that touch on a phone and separate from tablet up, as the river does.
    gapless: { type: Boolean, default: false }
  },
  data: () => ({ WIDTHS })
}
</script>
