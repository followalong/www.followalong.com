<template>
  <a
    v-if="src"
    :href="src"
    target="_blank"
    class="-mt-1"
  >
    <img
      :src="src"
    >
  </a>
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
