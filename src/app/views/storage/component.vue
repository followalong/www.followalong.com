<template>
  <PageBody>
    <BackupCard
      :app="app"
      :identity="identity"
    >
      <template #actions>
        <Button
          v-if="bucket.id"
          variant="destructive"
          aria-label="Disconnect"
          class="!py-1.5 !px-3 !text-chip"
          @click="disconnect"
        >
          Disconnect
        </Button>
      </template>
    </BackupCard>

    <Card v-if="account">
      <p class="text-body text-ink-secondary">
        This device syncs to your account. Sign out before you connect your
        own storage: its keys are written into the log, and the service can
        read the log an account keeps.
      </p>
    </Card>

    <AddonEditor
      v-else
      :app="app"
      :identity="identity"
      :addon="bucket"
      :button-text="bucket.id ? 'Change' : 'Connect'"
      :submit-text="bucket.id ? 'Save' : 'Connect'"
    />

    <Card
      v-if="bucket.id"
      :padded="false"
    >
      <ListRow
        title="Set up another device"
        meta="show it a code to scan"
        action
        aria-label="Show setup code"
        @click="handoffOpen = true"
      />
    </Card>

    <AnotherDevice
      :app="app"
      :identity="identity"
      :open="handoffOpen"
      @close="handoffOpen = false"
    />
  </PageBody>
</template>

<script>
import PageBody from '../../components/page-body/component.vue'
import BackupCard from '../../components/backup-card/component.vue'
import AddonEditor from '../../components/addon-editor/component.vue'
import Card from '../../components/card/component.vue'
import ListRow from '../../components/list-row/component.vue'
import Button from '../../components/button/component.vue'
import AnotherDevice from '../../components/another-device/component.vue'

// A bucket of the reader's own: its form, how it is going, the way out of it
// and the way to another device from it.
export default {
  components: { PageBody, BackupCard, AddonEditor, Card, ListRow, Button, AnotherDevice },

  props: ['app', 'identity'],

  data: () => ({ handoffOpen: false }),

  computed: {
    // The S3 add-on, carrying the identity's own record once it is installed.
    bucket () {
      return this.app.queries.availableAddonAdaptersForIdentity(this.identity).find((addon) => addon.type === 'S3Adapter')
    },

    // Signed in and with no bucket: the two are never both in use.
    account () {
      return !this.bucket.id && this.app.queries.accountForIdentity(this.identity)
    }
  },

  methods: {
    // Leaves the bucket and the feeds as they are.
    disconnect () {
      return this.app.confirm('Disconnect your own storage? Your feeds stay on this device and in the bucket.')
        .then(() => this.app.commands.removeAddonFromIdentity(this.identity, this.bucket))
        .catch(() => {})
    }
  }
}
</script>
