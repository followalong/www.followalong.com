<template>
  <div class="p-4 md:p-6 flex flex-col gap-4 md:gap-[18px] max-w-[560px]">
    <p class="text-meta text-ink-muted">
      Your identity lives only on this device
    </p>

    <div class="bg-white border border-hairline-strong rounded-xl overflow-hidden">
      <ListRow
        title="Add-ons"
        :meta="`${addonCount} installed`"
        to="/add-ons"
        aria-label="Add-ons"
      />
      <ListRow
        title="Back up this identity"
        meta="download the whole log"
        action
        aria-label="Export identity"
        @click="app.commands.downloadIdentity(identity)"
      >
        <template #trailing>
          <span class="text-meta font-semibold text-primary flex-none">Export</span>
        </template>
      </ListRow>
      <ListRow
        title="Copy this identity"
        meta="to paste on another device"
        action
        aria-label="Copy identity"
        @click="copyIdentity"
      >
        <template #trailing>
          <span class="text-meta font-semibold text-primary flex-none">{{ copied ? 'Copied' : 'Copy' }}</span>
        </template>
      </ListRow>
      <ListRow
        title="Import an identity"
        meta="from a backup or another device"
        action
        aria-label="Import identity"
        @click="importOpen = true"
      />
      <ListRow
        title="Roll up this identity"
        meta="clean up"
        action
        aria-label="Roll up identity"
        @click="rollUpIdentity"
      />
    </div>

    <div class="bg-white border border-hairline-strong rounded-xl overflow-hidden">
      <ListRow
        title="Help"
        meta="followalong@protonmail.com"
        to="/help"
        aria-label="Help"
      />
      <ListRow
        title="Changelog"
        meta="a feed you follow"
        :to="CHANGELOG_PATH"
        aria-label="Visit Changelog"
      />
    </div>

    <button
      type="button"
      aria-label="Forget identity"
      class="bg-danger-bg border border-danger-border rounded-xl px-4 py-3.5 flex items-center justify-between gap-3 text-left"
      @click="forgetIdentity"
    >
      <span>
        <span class="block text-[14px] font-bold text-danger">Forget this identity</span>
        <span class="block text-meta text-ink-secondary mt-0.5">Removes all traces on this device</span>
      </span>
      <span class="text-meta font-semibold text-danger flex-none">Forget me</span>
    </button>

    <Sheet
      :open="importOpen"
      title="Import an identity"
      @close="closeImport"
    >
      <form
        id="import-identity"
        aria-label="Import a backup"
        @submit.prevent="importIdentity"
      >
        <p class="text-body text-ink-secondary">
          Paste a backup exported from Follow Along. It is added alongside what
          is already on this device — nothing here is replaced.
        </p>
        <textarea
          v-model="backup"
          aria-label="Identity backup"
          rows="7"
          class="mt-3 block w-full rounded-field border border-hairline-strong bg-white px-3 py-2.5 text-[13px] font-mono text-ink outline-none focus:border-primary"
          placeholder="0/identities/…"
        />
        <p
          v-if="importError"
          class="mt-2 text-body text-danger"
        >
          {{ importError }}
        </p>
      </form>

      <template #footer>
        <Button
          type="submit"
          form="import-identity"
          class="flex-1"
          @click="importIdentity"
        >
          Import
        </Button>
      </template>
    </Sheet>
  </div>
</template>

<script>
import ListRow from '../../components/list-row/component.vue'
import Sheet from '../../components/sheet/component.vue'
import Button from '../../components/button/component.vue'

const CHANGELOG_PATH = '/https://changelog.followalong.com/feed.xml'

export default {
  components: {
    ListRow,
    Sheet,
    Button
  },

  props: ['app', 'identity'],

  data: () => ({
    CHANGELOG_PATH,
    importOpen: false,
    backup: '',
    importError: '',
    copied: false
  }),

  computed: {
    addonCount () {
      return this.app.queries.addonsForIdentity(this.identity).length
    }
  },

  methods: {
    copyIdentity () {
      return Promise.resolve(this.app.commands.copyIdentityToClipboard(this.identity))
        .then(() => { this.copied = true })
        .catch(() => {})
    },

    closeImport () {
      this.importOpen = false
      this.importError = ''
      this.backup = ''
    },

    importIdentity () {
      this.importError = ''

      return this.app.commands.importIdentity(this.backup)
        .then((identity) => {
          this.closeImport()
          this.app.setIdentity(identity)
          this.$router.push('/')
        })
        .catch((e) => { this.importError = e.message })
    },

    forgetIdentity () {
      this.app.confirm('Are you sure you want to remove this identity?')
        .then(() => this.app.commands.forgetIdentity(this.identity))
        .then(() => this.app.setIdentity(this.app.queries.allIdentities()[0]))
        .then(() => this.$router.push('/'))
        .catch(() => {})
    },

    rollUpIdentity () {
      this.app.confirm('Are you sure you want to roll up this identity?')
        .then(() => this.app.commands.createProjectionForIdentity(this.identity))
        .then(() => this.$router.push('/'))
        .catch(() => {})
    }
  }
}
</script>
