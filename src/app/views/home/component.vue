<template>
  <div>
    <PageTitle title="Welcome home!">
      <template #description>
        Sorting by most recent
      </template>
    </PageTitle>

    <FeedEntry
      v-for="entry in app.queries.entriesForIdentity(identity)"
      :key="app.queries.keyForEntry(entry)"
      :app="app"
      :identity="identity"
      :entry="entry"
    />
  </div>
</template>

<script>
import FeedEntry from '../../components/feed-entry/component.vue'
import PageTitle from '../../components/page-title/component.vue'

export default {
  components: {
    FeedEntry,
    PageTitle
  },

  props: ['app', 'identity'],

  beforeMount () {
    if (this.$route.query.feedUrl) {
      return this.$router.push(`/feeds/${this.$route.query.feedUrl}`)
    }
  }
}
</script>
