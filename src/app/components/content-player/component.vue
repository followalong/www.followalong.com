<template>
  <div
    v-if="content"
  >
    <div v-if="entryMetas.length">
      <div
        v-for="meta in entryMetas"
        :key="meta.content"
        class="prose max-w-none overflow-auto px-4 py-5 sm:px-6"
        v-html="app.queries.linkify(meta.content)"
      />
    </div>
    <div
      :class="`prose max-w-none ${isPlaying ? '' : 'max-h-48'} overflow-auto px-4 py-5 sm:px-6`"
      :aria-label="`Content for ${entry.id}`"
      v-html="html"
    />
    <div
      v-if="hasExpansion"
      class="z-10 text-center border-t border-gray-200"
    >
      <button
        class="w-full border-gray-100 text-indigo-600 p-3 text-base font-medium underline"
        :aria-label="`Toggle entry content ${entry.id}`"
        @click="isPlaying = !isPlaying"
      >
        <span v-if="isPlaying">Collapse</span>
        <span v-else>Read more</span>
      </button>
    </div>
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
    },
    html () {
      return this.app.queries.linkify(this.content)
    },
    hasExpansion () {
      return this.html.length > MAX_SUMMARY_LENGTH
    }
  },
  mounted () {
    if (this.entryMetas.length) {
      this.isPlaying = false
      return
    }

    this.isPlaying = !this.hasExpansion
  }
}
</script>
