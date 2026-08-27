<template>
  <div
    v-if="src"
    class="-mt-1 p-4"
  >
    <!-- A feed page mounts one of these per episode, and each one is a real
 media element on the device. The default is to fetch every file's headers on
 sight, which turns opening a podcast into as many downloads as it has
 episodes; nothing is asked for until someone presses play. -->
    <audio
      ref="audio"
      controls
      preload="none"
      class="w-full"
    >
      <source :src="src">
    </audio>
  </div>
</template>

<script>
export default {
  props: ['app', 'identity', 'entry'],
  computed: {
    src () {
      return this.app.queries.audioForEntry(this.entry)
    }
  },
  watch: {
    src () {
      this.app.commands.disableSleep(this.$refs.audio)
    }
  },
  unmounted () {
    this.app.commands.enableSleep(this.$refs.audio)
  }
}
</script>
