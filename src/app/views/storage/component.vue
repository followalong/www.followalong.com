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
        @click="openHandoff"
      />
    </Card>

    <Sheet
      :open="handoffOpen"
      title="Set up another device"
      @close="handoffOpen = false"
    >
      <p class="text-body text-ink-secondary">
        Point the other device's camera at this. It opens Follow Along there
        and pulls this identity down from your backup, so nothing has to be
        typed or pasted.
      </p>

      <QrCode
        v-if="handoffLink"
        :value="handoffLink"
        alt="Setup code"
        aria-label="Setup code"
        class="mt-4"
      />

      <p class="mt-4 text-body text-danger">
        Anyone who scans this can read your backup. Show it to your own camera,
        do not photograph it for anyone else.
      </p>

      <TextField
        :model-value="handoffLink"
        readonly
        multiline
        :rows="3"
        aria-label="Handoff link"
        class="mt-3"
        hint="The same thing as a link, for a device that cannot scan."
      />

      <p
        v-if="handoffError"
        class="mt-3 text-body text-danger"
      >
        {{ handoffError }}
      </p>

      <template #footer>
        <Button
          class="flex-1"
          variant="secondary"
          aria-label="Copy setup link"
          @click="copyHandoff"
        >
          {{ handoffCopied ? 'Copied' : 'Copy the link' }}
        </Button>
      </template>
    </Sheet>
  </PageBody>
</template>

<script>
import PageBody from '../../components/page-body/component.vue'
import BackupCard from '../../components/backup-card/component.vue'
import AddonEditor from '../../components/addon-editor/component.vue'
import Card from '../../components/card/component.vue'
import ListRow from '../../components/list-row/component.vue'
import Sheet from '../../components/sheet/component.vue'
import Button from '../../components/button/component.vue'
import TextField from '../../components/text-field/component.vue'
import QrCode from '../../components/qr-code/component.vue'

// A bucket of the reader's own: its form, how it is going, the way out of it
// and the code that sets up another device from it.
export default {
  components: { PageBody, BackupCard, AddonEditor, Card, ListRow, Sheet, Button, TextField, QrCode },

  props: ['app', 'identity'],

  data: () => ({
    handoffOpen: false,
    handoffLink: '',
    handoffError: '',
    handoffCopied: false
  }),

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
    },

    openHandoff () {
      this.handoffOpen = true
      this.handoffError = ''
      this.handoffCopied = false

      return this.app.commands.handoffForIdentity(this.identity)
        .then((setup) => {
          this.handoffLink = setup ? `${window.location.origin}/#${setup}` : ''
        })
        .catch((e) => { this.handoffError = e.message })
    },

    copyHandoff () {
      return Promise.resolve(this.app.commands.copyToClipboard(this.handoffLink))
        .then(() => { this.handoffCopied = true })
        .catch(() => {})
    }
  }
}
</script>
