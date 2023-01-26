<template>
  <div>
    <PageTitle title="Feeds you follow">
      <template #description>
        <p>The feeds you follow</p>
      </template>
      <template #meta />
    </PageTitle>

    <PageCard :has-padding="false">
      <template #title>
        <p class="font-medium text-gray-900">
          Following
        </p>
      </template>
      <template #content>
        <ul
          role="list"
          class="divide-y divide-gray-200"
        >
          <li
            v-for="feed in app.queries.feedsForIdentity(identity)"
            :key="feed.id"
          >
            <router-link
              :to="`/${app.queries.urlForFeed(feed)}`"
              class="block px-5 sm:px-6"
              :aria-label="`Visit ${app.queries.titleForFeed(feed)} feed`"
            >
              <div class="flex space-x-3 flex-shrink-0 items-center py-4">
                <p
                  class="h-10 w-10 mr-3 rounded-full bg-gray-100"
                >
                  <img
                    v-if="app.queries.imageForFeed(feed)"
                    class="h-10 w-10 rounded-full"
                    :src="app.queries.imageForFeed(feed)"
                  >
                </p>

                <div class="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                  <div class="truncate">
                    <div class="flex text-sm">
                      <p class="truncate font-medium primary-color">
                        {{ app.queries.titleForFeed(feed) }}
                      </p>
                      <p class="ml-1 flex-shrink-0 font-normal text-gray-500">
                        &nbsp;
                        <span class="font-medium">·</span>
                        &nbsp;
                        {{ app.queries.entriesForFeed(identity, feed).length }} items
                      </p>
                    </div>
                    <div class="mt-2 flex">
                      <div class="flex items-center text-sm text-gray-500">
                        <!-- Heroicon name: mini/calendar -->
                        <svg
                          class="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z"
                            clip-rule="evenodd"
                          />
                        </svg>
                        <p>
                          Last item
                          <span :title="app.queries.dateForEntry(app.queries.lastEntryForFeed(identity, feed))">
                            {{ app.queries.niceDateForEntry(app.queries.lastEntryForFeed(identity, feed)) }}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="ml-5 flex-shrink-0">
                  <!-- Heroicon name: mini/chevron-right -->
                  <svg
                    class="h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </router-link>
          </li>
        </ul>
      </template>
    </PageCard>
  </div>
</template>

<script>
import PageTitle from '../../components/page-title/component.vue'
import PageCard from '../../components/page-card/component.vue'

export default {
  components: {
    PageCard,
    PageTitle
  },

  props: ['app', 'identity']
}
</script>
