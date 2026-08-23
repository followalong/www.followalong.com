<template>
  <button
    v-if="newEntriesLength"
    type="button"
    aria-label="Show new items"
    class="block w-full bg-accent-tint px-4 py-3 text-left text-body font-semibold text-accent-ink border-b border-hairline transition-colors"
    @click="app.commands.showNewEntries(identity)"
  >
    {{ newEntriesLength }} new item{{ newEntriesLength === 1 ? '' : 's' }} — show now
  </button>
</template>

<script>
// In flow, not fixed: it was pinned across the whole viewport, which put it
// outside the app's column and on top of whatever it landed on.
export default {
  props: ['app', 'identity', 'entries'],

  computed: {
    newEntriesLength () {
      return this.app.queries.filterNewEntries(this.identity, this.entries).length
    }
  }
}
</script>
