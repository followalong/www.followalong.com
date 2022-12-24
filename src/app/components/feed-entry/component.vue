<template>
  <section
    class="block mb-8"
    aria-labelledby="applicant-information-title"
  >
    <div class="bg-white shadow sm:rounded-lg">
      <div class="px-4 py-5 sm:px-6">
        <div class="flex justify-between">
          <div class="flex space-x-3 flex-shrink-0">
            <router-link
              :to="`/feeds/${app.queries.urlForFeed(feed)}`"
              class="block flex-shrink-0 mr-2"
            >
              <img
                v-if="feed"
                class="h-10 w-10 rounded-full bg-gray-100"
                :src="app.queries.imageForFeed(feed)"
                :alt="app.queries.titleForFeed(feed)"
              >
            </router-link>
            <div>
              <router-link
                :to="`/${app.queries.urlForFeed(feed)}`"
                class="font-medium text-gray-900"
              >
                {{ app.queries.titleForEntry(entry) }}
              </router-link>
              <div
                v-if="feed"
                class="mt-1 text-sm text-gray-500"
              >
                <router-link
                  :to="`/feeds/${app.queries.urlForFeed(feed)}`"
                >
                  {{ app.queries.titleForFeed(feed) }}
                </router-link>
                &nbsp;
                <span class="font-medium">·</span>
                &nbsp;
                <span :title="app.queries.dateForEntry(entry)">
                  {{ app.queries.niceDateForEntry(entry) }}
                </span>
              </div>
            </div>
          </div>
          <!-- <div class="flex space-x-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-6 h-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
              />
            </svg>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-6 h-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div> -->
        </div>
      </div>
      <div class="border-t border-gray-200 px-4 py-5 sm:px-6">
        <div
          class="prose max-w-none"
          v-html="app.queries.contentForEntry(entry)"
        />
      </div>
    </div>
  </section>
</template>

<script>
export default {
  props: ['app', 'identity', 'entry'],
  computed: {
    feed () {
      return this.app.queries.feedForIdentity(this.identity, this.entry.feedUrl)
    }
  }
}
</script>
