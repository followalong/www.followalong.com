<template>
  <div>
    <EntryCard
      :title="app.queries.titleForEntry(entry)"
      :media="media"
      :summary="summary"
      :done="isRead"
      :subject="`${entry.id}`"
      :readable="!!content"
      :poster="app.queries.imageForEntry(entry) || ''"
      @done="toggleRead"
      @read="reading = true"
      @play="$emit('play', entry)"
    >
      <template
        v-if="media === 'image'"
        #lead
      >
        <ImagePlayer
          :app="app"
          :identity="identity"
          :entry="entry"
        />
      </template>

      <template #meta>
        <router-link
          v-if="entryFeed"
          :to="`/${app.queries.urlForFeed(entryFeed)}`"
          aria-label="Feed link"
          class="font-semibold"
        >
          {{ app.queries.titleForFeed(entryFeed) }}
        </router-link>
        <span v-if="entryFeed"> · </span>
        <span :title="app.queries.dateForEntry(entry)">
          {{ app.queries.niceDateForEntry(entry) }}
        </span>
      </template>

      <template
        v-if="app.queries.audioForEntry(entry)"
        #player
      >
        <AudioPlayer
          :app="app"
          :identity="identity"
          :entry="entry"
        />
      </template>
    </EntryCard>

    <EntryReader
      :open="reading"
      :entry-id="`${entry.id}`"
      :title="app.queries.titleForEntry(entry)"
      :meta="readerMeta"
      :content="html"
      :link="app.queries.linkForEntry(entry) || ''"
      @close="reading = false"
      @skip="reading = false"
      @done="finishReading"
    />
  </div>
</template>

<script>
import EntryCard from '../entry-card/component.vue'
import EntryReader from '../entry-reader/component.vue'
import AudioPlayer from '../audio-player/component.vue'
import ImagePlayer from '../image-player/component.vue'

export default {
  components: {
    EntryCard,
    EntryReader,
    AudioPlayer,
    ImagePlayer
  },
  props: ['app', 'identity', 'entry', 'feed'],
  emits: ['play'],
  data: () => ({ reading: false }),
  computed: {
    entryFeed () {
      return this.feed || this.feedFromIdentity
    },

    feedFromIdentity () {
      return this.app.queries.feedForIdentity(this.identity, this.entry.feedId)
    },

    media () {
      if (this.app.queries.videoForEntry(this.entry)) return 'video'
      if (this.app.queries.audioForEntry(this.entry)) return 'audio'
      if (this.app.queries.imageForEntry(this.entry)) return 'image'

      return 'text'
    },

    content () {
      return this.app.queries.contentForEntry(this.entry)
    },

    html () {
      return this.content ? this.app.queries.linkify(this.content) : ''
    },

    // What the Entry Summarizer add-on produced, if it is installed.
    summary () {
      return this.app.queries.metasForEntryForIdentity(this.identity, this.entry)
        .map((meta) => meta.content)
        .join(' ')
    },

    readerMeta () {
      const feed = this.entryFeed ? `${this.app.queries.titleForFeed(this.entryFeed)} · ` : ''

      return `${feed}${this.app.queries.niceDateForEntry(this.entry)}`
    },

    isRead () {
      return !!this.app.queries.isEntryRead(this.entry)
    }
  },
  methods: {
    finishReading () {
      this.reading = false

      if (!this.isRead) this.toggleRead()
    },

    toggleRead () {
      if (this.isRead) {
        this.app.commands.markEntryAsUnreadForIdentity(this.identity, this.entry)
        return
      }

      this.app.commands.markEntryAsReadForIdentity(this.identity, this.entry)
    }
  }
}
</script>
