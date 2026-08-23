<template>
  <div
    data-page-body
    :class="`md:px-6 md:py-5 flex flex-col ${WIDTHS[width]} ${gapless ? 'gap-0 md:gap-3.5' : 'gap-4'}`"
  >
    <slot />
  </div>
</template>

<script>
// Every page sat on the same column and repeated the same six classes to say
// so. Desktop is tablet, so nothing here grows past the app width.
const WIDTHS = {
  river: 'max-w-river md:mx-auto',
  app: 'max-w-app',
  panel: 'max-w-panel'
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
