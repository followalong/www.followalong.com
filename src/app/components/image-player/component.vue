<template>
  <img
    v-if="src"
    :src="src"
    class="-mt-1 w-full"
    loading="lazy"
    decoding="async"
  >
</template>

<script>
export default {
  props: ['app', 'identity', 'entry'],
  computed: {
    src () {
      return this.app.queries.imageForEntry(this.entry)
    }
  }
}
</script>
