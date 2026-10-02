<template>
  <Card :tone="quiet ? 'default' : sync.status === 'failed' ? 'danger' : 'success'">
    <h2
      :class="`text-sm font-bold ${
        quiet ? 'text-ink' : sync.status === 'failed' ? 'text-danger' : 'text-following'
      }`"
    >
      {{ unpaid ? SYNC_TITLES.off : SYNC_TITLES[sync.status] }}
    </h2>
    <p class="text-meta text-ink-secondary mt-1">
      <span v-if="sync.status === 'off'">
        This device is the only copy. If you lose it, you lose everything.
      </span>
      <span v-else-if="sync.status === 'failed'">{{ sync.error }}</span>
      <span v-else-if="sync.at">Last saved to {{ sync.target }} {{ syncedAgo }}</span>
      <span v-else>Saving to {{ sync.target }}…</span>
    </p>

    <slot name="details" />

    <div
      v-if="sync.status !== 'off'"
      class="flex flex-wrap gap-2 mt-3"
    >
      <Button
        :variant="sync.status === 'failed' && !unpaid ? 'destructive' : 'secondary'"
        aria-label="Back up now"
        class="!py-1.5 !px-3 !text-chip"
        @click="backUpNow"
      >
        {{ sync.status === 'syncing' ? 'Backing up…' : 'Back up now' }}
      </Button>
      <slot name="actions" />
    </div>

    <slot />
  </Card>
</template>

<script>
import Card from '../card/component.vue'
import Button from '../button/component.vue'

const SYNC_TITLES = {
  off: 'Not backed up',
  idle: 'Backup configured',
  syncing: 'Backing up…',
  saved: 'Backed up',
  failed: 'Backup failed'
}

// Where the identity is kept besides this device, and how that is going. The
// same card on the You page and on the bucket's own page.
export default {
  components: { Card, Button },

  props: ['app', 'identity'],

  data: () => ({ SYNC_TITLES, now: Date.now() }),

  computed: {
    sync () {
      return this.app.queries.syncStatusForIdentity(this.identity)
    },

    // An account that is not paid up is not a backup that failed: nothing was
    // tried, and the sentence says what would start it.
    unpaid () {
      return ['no_subscription', 'subscription_expired', 'account_cancelled'].includes(this.sync.reason)
    },

    quiet () {
      return this.unpaid || this.sync.status === 'off'
    },

    syncedAgo () {
      const seconds = Math.max(0, Math.round((this.now - this.sync.at) / 1000))

      if (seconds < 60) return 'just now'
      if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`

      return new Date(this.sync.at).toLocaleString()
    }
  },

  methods: {
    backUpNow () {
      this.now = Date.now()

      return this.app.commands.syncIdentity(this.identity)
        .then(() => { this.now = Date.now() })
    }
  }
}
</script>
