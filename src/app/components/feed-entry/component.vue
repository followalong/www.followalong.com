<template>
  <PageCard :has-padding="false">
    <template #title>
      <div>
        <router-link
          v-if="app.queries.imageForFeed(entryFeed)"
          :to="`/${app.queries.urlForFeed(entryFeed)}`"
          class="block flex-shrink-0 mr-2"
        >
          <img
            v-if="entryFeed"
            class="h-10 w-10 rounded-full bg-gray-100"
            :src="app.queries.imageForFeed(entryFeed)"
            :alt="app.queries.titleForFeed(entryFeed)"
          >
        </router-link>
        <div>
          <router-link
            v-if="app.queries.titleForEntry(entry)"
            :to="`/${app.queries.urlForFeed(entryFeed)}`"
            class="font-medium text-gray-900"
            aria-label="Entry title"
          >
            {{ app.queries.titleForEntry(entry) }}
          </router-link>
          <div
            v-if="entryFeed"
            class="mt-1 text-sm text-gray-500"
          >
            <router-link
              :to="`/${app.queries.urlForFeed(entryFeed)}`"
              aria-label="Feed link"
            >
              {{ app.queries.titleForFeed(entryFeed) }}
            </router-link>
              &nbsp;
            <span class="font-medium">·</span>
              &nbsp;
            <span :title="app.queries.dateForEntry(entry)">
              {{ app.queries.niceDateForEntry(entry) }}
            </span>
            <span v-if="app.queries.linkForEntry(entry)">
              &nbsp;
              <span class="font-medium">·</span>
                &nbsp;
              <a
                :href="app.queries.linkForEntry(entry)"
                target="_blank"
              >
                Source
              </a>
            </span>
          </div>
        </div>
      </div>
      <a
        v-if="feedFromIdentity"
        href="javascript:;"
        :class="`block float-right ${app.queries.isEntryRead(entry) ? 'text-green-500' : 'text-gray-300'}`"
        :aria-label="`Mark as ${app.queries.isEntryRead(entry) ? 'un' : ''}read ${entry.id}`"
        @click="toggleRead(entry)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="w-6 h-6"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clip-rule="evenodd"
          />
        </svg>
      </a>
    </template>
    <template #content>
      <VideoPlayer
        v-if="app.queries.videoForEntry(entry)"
        :app="app"
        :identity="identity"
        :entry="entry"
      />
      <AudioPlayer
        v-else-if="app.queries.audioForEntry(entry)"
        :app="app"
        :identity="identity"
        :entry="entry"
      />
      <ImagePlayer
        v-else-if="app.queries.imageForEntry(entry)"
        :app="app"
        :identity="identity"
        :entry="entry"
      />
      <div
        v-if="app.queries.contentForEntry(entry)"
        class="prose max-w-none px-4 py-5 sm:px-6"
        v-html="app.queries.contentForEntry(entry)"
      />
    </template>
  </PageCard>
</template>

<script>
import PageCard from '../../components/page-card/component.vue'
import AudioPlayer from '../../components/audio-player/component.vue'
import ImagePlayer from '../../components/image-player/component.vue'
import VideoPlayer from '../../components/video-player/component.vue'

export default {
  components: {
    PageCard,
    AudioPlayer,
    ImagePlayer,
    VideoPlayer
  },
  props: ['app', 'identity', 'entry', 'feed'],
  computed: {
    entryFeed () {
      return this.feed || this.feedFromIdentity
    },

    feedFromIdentity () {
      return this.app.queries.feedForIdentity(this.identity, this.entry.feedId)
    }
  },
  methods: {
    toggleRead (entry) {
      if (this.app.queries.isEntryRead(entry)) {
        this.app.commands.markEntryAsUnreadForIdentity(this.identity, entry)
        return
      }

      this.app.commands.markEntryAsReadForIdentity(this.identity, entry)
    }
  }
}
</script>
