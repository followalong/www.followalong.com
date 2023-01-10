<template>
  <div
    v-if="src"
    class="-mt-1 p-4"
  >
    <audio
      ref="audio"
      controls
      class="w-full"
    >
      <source :src="src">
    </audio>
  </div>
</template>

<script>
import NoSleep from 'nosleep.js'

const noSleep = new NoSleep()

export default {
  props: ['app', 'identity', 'entry'],
  computed: {
    src () {
      return this.app.queries.audioForEntry(this.entry)
    }
  },
  watch: {
    src () {
      this.$refs.audio.currentTime = 0
      this.$refs.audio.play()
      noSleep.enable()
    }
  },
  unmounted () {
    noSleep.disable()
  }
}
</script>
