<template>
  <div v-if="thumbnail && !isPlaying">
    <a
      href="javascript:;"
      @click="isPlaying = true"
    >
      <ImagePlayer
        :app="app"
        :identity="identity"
        :entry="entry"
      />
    </a>
  </div>
  <div
    v-else-if="src"
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
      preload="none"
      controls
      :autoplay="isPlaying"
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
import ImagePlayer from '../../components/image-player/component.vue'

export default {
  components: {
    ImagePlayer
  },
  props: ['app', 'identity', 'entry'],
  data () {
    return {
      isPlaying: false
    }
  },
  computed: {
    src () {
      return this.app.queries.videoForEntry(this.entry)
    },
    useIframe () {
      return /youtube/.test(this.src) || !/mp4|ogg/.test(this.src)
    },
    thumbnail () {
      return this.app.queries.imageForEntry(this.entry)
    }
  }
}
</script>
