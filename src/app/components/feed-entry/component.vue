<template>
  <PageCard>
    <template #title>
      <router-link
        v-if="app.queries.imageForFeed(theFeed)"
        :to="`/${app.queries.urlForFeed(theFeed)}`"
        class="block flex-shrink-0 mr-2"
      >
        <img
          v-if="theFeed"
          class="h-10 w-10 rounded-full bg-gray-100"
          :src="app.queries.imageForFeed(theFeed)"
          :alt="app.queries.titleForFeed(theFeed)"
        >
      </router-link>
      <div>
        <router-link
          v-if="app.queries.titleForEntry(entry)"
          :to="`/${app.queries.urlForFeed(theFeed)}`"
          class="font-medium text-gray-900"
          aria-label="Entry title"
        >
          {{ app.queries.titleForEntry(entry) }}
        </router-link>
        <div
          v-if="theFeed"
          class="mt-1 text-sm text-gray-500"
        >
          <router-link
            :to="`/${app.queries.urlForFeed(theFeed)}`"
          >
            {{ app.queries.titleForFeed(theFeed) }}
          </router-link>
          &nbsp;
          <span class="font-medium">·</span>
          &nbsp;
          <span :title="app.queries.dateForEntry(entry)">
            {{ app.queries.niceDateForEntry(entry) }}
          </span>
        </div>
      </div>
    </template>
    <template #content>
      <div
        class="prose max-w-none"
        v-html="app.queries.contentForEntry(entry)"
      />
    </template>
  </PageCard>
</template>

<script>
import PageCard from '../../components/page-card/component.vue'

export default {
  components: {
    PageCard
  },
  props: ['app', 'identity', 'entry', 'feed'],
  computed: {
    theFeed () {
      return this.feed || this.app.queries.feedForIdentity(this.identity, this.entry.feedId)
    }
  }
}
</script>
