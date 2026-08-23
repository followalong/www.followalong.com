<template>
  <img
    :src="source"
    :alt="alt"
    class="block w-full max-w-qr mx-auto rounded-xl bg-white"
  >
</template>

<script>
import qrcode from 'qrcode-generator'

// 0 picks the smallest version the text fits in. 'M' rather than 'L' because
// this is read off a screen, where glare and moire eat modules.
const VERSION = 0
const CORRECTION = 'M'
const CELL = 4
const MARGIN = 8

export default {
  props: {
    value: { type: String, required: true },
    alt: { type: String, default: '' }
  },

  computed: {
    // A GIF data URL rather than an SVG of a few thousand rects: same picture,
    // one element, and about a tenth of the bytes.
    source () {
      const code = qrcode(VERSION, CORRECTION)

      code.addData(this.value)
      code.make()

      return code.createDataURL(CELL, MARGIN)
    }
  }
}
</script>
