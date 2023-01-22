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
