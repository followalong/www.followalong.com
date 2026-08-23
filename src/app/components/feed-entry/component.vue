<template>
  <div>
    <EntryCard
      :title="app.queries.titleForEntry(entry)"
      :media="media"
      :summary="summary"
      :summary-label="summaryLabel"
      :done="isRead"
      savable
      :saved="isSaved"
      :subject="`${entry.id}`"
      :readable="!!content"
      :poster="app.queries.imageForEntry(entry) || ''"
      @done="toggleRead"
      @save="toggleSave"
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
        <span v-if="kind"> · {{ kind }}</span>
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

const MAX_SUMMARY = 200

const twoSentences = (html) => {
  if (!html) return ''

  const text = `${html}`
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const sentences = text.match(/[^.!?]+[.!?]+/g)
  const taken = sentences ? sentences.slice(0, 2).join(' ').trim() : text

  if (taken.length <= MAX_SUMMARY) return taken

  return `${taken.slice(0, MAX_SUMMARY).replace(/\s+\S*$/, '')}…`
}

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
    addonSummary () {
      return this.app.queries.metasForEntryForIdentity(this.identity, this.entry)
        .map((meta) => meta.content)
        .join(' ')
    },

    // The add-on hands back markup, and often the whole entry. The card wants
    // two sentences of plain text, so take them here rather than render a wall.
    summary () {
      return twoSentences(this.addonSummary || this.content)
    },

    summaryLabel () {
      return this.addonSummary ? 'SUMMARY' : ''
    },

    kind () {
      return { video: 'Watch', audio: 'Listen' }[this.media] || ''
    },

    readerMeta () {
      const feed = this.entryFeed ? `${this.app.queries.titleForFeed(this.entryFeed)} · ` : ''

      return `${feed}${this.app.queries.niceDateForEntry(this.entry)}`
    },

    isSaved () {
      return this.app.queries.isEntrySaved(this.entry)
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

    toggleSave () {
      if (this.isSaved) {
        this.app.commands.unsaveEntryForIdentity(this.identity, this.entry)
        return
      }

      this.app.commands.saveEntryForIdentity(this.identity, this.entry)
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
