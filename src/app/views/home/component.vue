<template>
  <div>
    <PageTitle title="Home">
      <template #description>
        Sorting by most recent
      </template>
    </PageTitle>

    <FeedEntry
      v-for="entry in app.queries.entriesForIdentity(identity)"
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

  props: ['app', 'identity']
}
</script>
