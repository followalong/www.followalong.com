<template>
  <ListRow
    :title="title"
    :meta="meta"
    :to="`/${app.queries.urlForFeed(feed)}`"
    :muted="!unread"
    :aria-label="`Visit ${title} feed`"
  >
    <template #leading>
      <span class="h-slot w-slot flex-none rounded-field bg-surface-sunken overflow-hidden flex items-center justify-center">
        <!-- The list has no cap, so this is every feed's artwork at
 once — full-size cover art shrunk into a 34px square. Left eager, a phone
 downloads and decodes the lot before anyone has scrolled past the first
 screen. -->
        <img
          v-if="image"
          class="h-full w-full object-cover"
          :src="image"
          alt=""
          loading="lazy"
          decoding="async"
        >
        <span
          v-else
          class="text-field font-bold text-ink-subtle"
        >{{ initial }}</span>
      </span>
    </template>

    <template #trailing>
      <span
        v-if="paused"
        data-paused-badge
        class="flex-none rounded-pill bg-surface-sunken px-2 py-0.5 text-tiny font-bold text-ink-muted"
      >Paused</span>
      <span
        v-if="unread"
        class="flex-none rounded-pill bg-accent px-2 py-0.5 text-tiny font-bold text-ink"
      >{{ unread }} new</span>
    </template>
  </ListRow>
</template>

<script>
import ListRow from '../list-row/component.vue'

// One row, so the list above it can hand this component a feed and nothing
// else. The slots used to live in the v-for, closing over the loop variable,
// which Vue cannot mark stable: every row re-rendered whenever the list did,
// and the list re-runs whenever anything touches the feeds collection. A
// keystroke in the filter and a poll writing one fetched event per feed both
// redrew all of them to produce the same pixels.
export default {
  components: { ListRow },

  props: ['app', 'identity', 'feed'],

  computed: {
    title () {
      return this.app.queries.titleForFeed(this.feed)
    },

    image () {
      return this.app.queries.imageForFeed(this.feed)
    },

    initial () {
      return (this.title || '?').trim().charAt(0).toUpperCase()
    },

    paused () {
      return this.app.queries.isFeedPaused(this.feed)
    },

    unread () {
      return this.app.queries.unreadEntriesForFeedLength(this.identity, this.feed)
    },

    // Paused has its own badge on the row, so this line is free to say the same
    // thing it says about every other feed: when something last arrived.
    meta () {
      if (!this.unread) {
        const last = this.app.queries.niceDateForEntry(
          this.app.queries.lastEntryForFeed(this.identity, this.feed)
        )

        return last ? `Nothing new · last ${last}` : 'Nothing new'
      }

      return `${this.app.queries.entriesForFeed(this.identity, this.feed).length} items`
    }
  }
}
</script>
