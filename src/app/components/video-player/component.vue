<template>
  <div
    v-if="src"
    class="-mt-1"
  >
    <iframe
      v-if="useIframe"
      :src="src"
      class="w-full aspect-video"
      frameborder="0"
      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    />
    <video
      v-else
      class="w-full aspect-video"
      controls
    >
      <source
        :src="src"
        type="video/mp4"
      >
      Your browser does not support the video tag.
    </video>
  </div>
</template>

<script>
export default {
  props: ['app', 'identity', 'entry'],
  computed: {
    src () {
      return this.app.queries.videoForEntry(this.entry)
    },
    useIframe () {
      return !/mp4|ogg$/.test(this.src)
    }
  }
}
</script>
