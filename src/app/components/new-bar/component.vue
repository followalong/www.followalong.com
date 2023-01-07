<template>
  <p
    v-if="newEntriesLength"
    class="fixed -mt-6 left-0 right-0 p-2 bg-blue-100 primary-color"
  >
    You have {{ newEntriesLength }} new item{{ newEntriesLength === 1 ? '' : 's' }}!
    <a
      href="javascript:;"
      class="underline"
      aria-label="Show new items"
      @click="app.commands.showNewEntries(identity)"
    >
      Show now.
    </a>
  </p>
</template>

<script>
export default {
  props: ['app', 'identity', 'entries'],

  computed: {
    newEntriesLength () {
      return this.app.queries.filterNewEntries(this.entries).length
    }
  }
}
</script>
