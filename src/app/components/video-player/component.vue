<template>
  <div
    v-if="src"
    class="aspect-ratio-box -mt-1"
  >
    <iframe
      :src="src"
      class="aspect-ratio-box-inside"
      frameborder="0"
      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    />
  </div>
</template>

<script>
export default {
  props: ['app', 'identity', 'entry'],
  computed: {
    src () {
      return this.app.queries.videoForEntry(this.entry)
    }
  }
}
</script>
