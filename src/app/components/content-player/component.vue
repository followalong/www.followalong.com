<template>
  <div v-if="content">
    <div v-if="entryMetas.length">
      <div
        v-for="meta in entryMetas"
        :key="meta.content"
        class="prose max-w-none overflow-auto px-4 py-5 sm:px-6"
        v-html="app.queries.linkify(meta.content)"
      />
    </div>
    <div
      class="prose max-w-none max-h-48 overflow-auto px-4 py-5 sm:px-6"
      v-html="app.queries.linkify(content)"
    />
  </div>
</template>

<script>
const MAX_SUMMARY_LENGTH = 255

export default {
  props: ['app', 'identity', 'entry'],
  data () {
    return {
      content: this.app.queries.contentForEntry(this.entry),
      isPlaying: false
    }
  },
  computed: {
    entryMetas () {
      return this.app.queries.metasForEntryForIdentity(this.identity, this.entry)
    }
  },
  mounted () {
    if (this.entryMetas.length) {
      this.isPlaying = false
    } else if (this.content.length <= MAX_SUMMARY_LENGTH) {
      this.isPlaying = true
    } else {
      this.isPlaying = false
    }
  }
}
</script>
