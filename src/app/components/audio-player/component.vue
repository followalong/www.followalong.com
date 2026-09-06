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
      controls
      preload="none"
      class="w-full"
      @play="onPlay"
      @pause="onStop"
      @ended="onStop"
    >
      <source :src="src">
    </audio>
  </div>
</template>

<script>
export default {
  props: ['app', 'identity', 'entry'],
  data: () => ({ playing: false }),
  computed: {
    src () {
      return this.app.queries.audioForEntry(this.entry)
    }
  },
  unmounted () {
    this.onStop()
  },
  methods: {
    onPlay () {
      this.playing = true
      this.app.commands.keepScreenAwake()
      this.app.commands.notePlaying(this.identity, {
        kind: 'audio',
        title: this.app.queries.titleForEntry(this.entry)
      })
    },

    // Only the player that took the screen gives it back. A feed page mounts
    // one of these per episode, and the other thirty-nine leaving the page
    // must not turn the screen off under the one that is playing.
    onStop () {
      if (!this.playing) return

      this.playing = false
      this.app.commands.letScreenSleep()
      this.app.commands.notePlaying(this.identity, null)
    }
  }
}
</script>
