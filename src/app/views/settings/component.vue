<template>
  <div class="p-4 md:p-6 flex flex-col gap-4 md:gap-[18px] max-w-[560px]">
    <section
      :class="`rounded-xl border p-4 md:p-5 ${
        sync.status === 'failed'
          ? 'bg-danger-bg border-danger-border'
          : sync.status === 'off'
            ? 'bg-white border-hairline-strong'
            : 'bg-following-bg border-following-border'
      }`"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h2
            :class="`text-[14px] font-bold ${
              sync.status === 'failed'
                ? 'text-danger'
                : sync.status === 'off' ? 'text-ink' : 'text-following'
            }`"
          >
            {{ SYNC_TITLES[sync.status] }}
          </h2>
          <p class="text-meta text-ink-secondary mt-1">
            <span v-if="sync.status === 'off'">
              This device is the only copy. If you lose it, you lose everything.
            </span>
            <span v-else-if="sync.status === 'failed'">{{ sync.error }}</span>
            <span v-else-if="sync.at">Last saved to {{ sync.target }} {{ syncedAgo }}</span>
            <span v-else>Saving to {{ sync.target }}…</span>
          </p>
          <p class="text-meta text-ink-muted mt-1.5">
            {{ contents.feeds }} feeds · {{ contents.entries }} entries ·
            {{ contents.events }} events in the log
          </p>
        </div>
      </div>

      <div class="flex gap-2 mt-3">
        <Button
          v-if="sync.status === 'off'"
          aria-label="Set up backups"
          class="!py-1.5 !px-3 !text-chip"
          @click="$router.push('/marketplace')"
        >
          Set up backups
        </Button>
        <Button
          v-else
          :variant="sync.status === 'failed' ? 'destructive' : 'secondary'"
          aria-label="Back up now"
          class="!py-1.5 !px-3 !text-chip"
          @click="backUpNow"
        >
          {{ sync.status === 'syncing' ? 'Backing up…' : 'Back up now' }}
        </Button>
        <Button
          variant="secondary"
          aria-label="Export identity"
          class="!py-1.5 !px-3 !text-chip"
          @click="app.commands.downloadIdentity(identity)"
        >
          Download a copy
        </Button>
      </div>
    </section>

    <div class="bg-white border border-hairline-strong rounded-xl overflow-hidden">
      <ListRow
        title="Name"
        :meta="app.queries.nameForIdentity(identity)"
        action
        aria-label="Rename identity"
        @click="openRename"
      />
      <ListRow
        title="Encryption"
        :meta="STRATEGY_LABELS[strategy]"
        action
        aria-label="Change encryption"
        @click="encryptionOpen = true"
      />
      <ListRow
        title="Switch identity"
        :meta="`${identities.length} on this device`"
        action
        aria-label="Switch identity"
        @click="switchOpen = true"
      />
    </div>

    <div class="bg-white border border-hairline-strong rounded-xl overflow-hidden">
      <ListRow
        title="Add-ons"
        :meta="`${addonCount} installed`"
        to="/add-ons"
        aria-label="Add-ons"
      />
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
        title="About Follow Along"
        meta="what this is, and why"
        to="/about"
        aria-label="About Follow Along"
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
      :open="encryptionOpen"
      title="Encryption"
      @close="encryptionOpen = false"
    >
      <p class="text-body text-ink-secondary">
        This protects the copy of your log that add-ons sync off this device.
        What is stored locally is always readable by this browser.
      </p>

      <div class="mt-3 border border-hairline-strong rounded-xl overflow-hidden">
        <ListRow
          v-for="(label, key) in STRATEGY_LABELS"
          :key="key"
          :title="label"
          :meta="key === strategy ? 'in use' : STRATEGY_HINTS[key]"
          action
          :aria-label="`Encrypt with ${key}`"
          @click="changeEncryption(key)"
        />
      </div>
    </Sheet>

    <Sheet
      :open="renameOpen"
      title="Name this identity"
      @close="renameOpen = false"
    >
      <form
        id="rename-identity"
        aria-label="Save identity name"
        @submit.prevent="renameIdentity"
      >
        <p class="text-body text-ink-secondary">
          Only you ever see this. It tells your identities apart on this device.
        </p>
        <input
          v-model="name"
          aria-label="Identity name"
          class="mt-3 block w-full rounded-field border border-hairline-strong bg-white px-3 py-2.5 text-body text-ink outline-none focus:border-primary"
          placeholder="My Account"
        >
      </form>

      <template #footer>
        <Button
          type="submit"
          form="rename-identity"
          class="flex-1"
          @click="renameIdentity"
        >
          Save
        </Button>
      </template>
    </Sheet>

    <Sheet
      :open="switchOpen"
      title="Your identities"
      @close="switchOpen = false"
    >
      <div class="border border-hairline-strong rounded-xl overflow-hidden">
        <ListRow
          v-for="option in identities"
          :key="option.id"
          :title="app.queries.nameForIdentity(option)"
          :meta="option.id === identity.id ? 'in use' : ''"
          action
          :aria-label="`Switch to ${app.queries.nameForIdentity(option)}`"
          @click="useIdentity(option)"
        />
      </div>

      <template #footer>
        <Button
          class="flex-1"
          aria-label="Add identity"
          @click="addIdentity"
        >
          Add another identity
        </Button>
      </template>
    </Sheet>

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

const SYNC_TITLES = {
  off: 'Not backed up',
  idle: 'Backup configured',
  syncing: 'Backing up…',
  saved: 'Backed up',
  failed: 'Backup failed'
}

const STRATEGY_LABELS = {
  none: 'Not encrypted',
  ask: 'Ask for a password',
  store: 'Remember a password'
}

const STRATEGY_HINTS = {
  none: 'synced in the clear',
  ask: 'asked for each session',
  store: 'kept on this device'
}

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
    encryptionOpen: false,
    strategy: 'none',
    STRATEGY_LABELS,
    SYNC_TITLES,
    now: Date.now(),
    STRATEGY_HINTS,
    renameOpen: false,
    switchOpen: false,
    name: '',
    backup: '',
    importError: '',
    copied: false
  }),

  computed: {
    sync () {
      return this.app.queries.syncStatusForIdentity(this.identity)
    },

    contents () {
      return this.app.queries.backupContentsForIdentity(this.identity)
    },

    syncedAgo () {
      const seconds = Math.max(0, Math.round((this.now - this.sync.at) / 1000))

      if (seconds < 60) return 'just now'
      if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`

      return new Date(this.sync.at).toLocaleString()
    },

    identities () {
      return this.app.queries.allIdentities()
    },

    addonCount () {
      return this.app.queries.addonsForIdentity(this.identity).length
    }
  },

  mounted () {
    this.readStrategy()
  },

  methods: {
    backUpNow () {
      this.now = Date.now()

      return this.app.commands.syncIdentity(this.identity)
        .then(() => { this.now = Date.now() })
    },

    readStrategy () {
      return this.app.commands.keychain.getStrategy(this.identity.id)
        .then((strategy) => { this.strategy = strategy })
        .catch(() => {})
    },

    changeEncryption (strategy) {
      return this.app.commands.changeEncryptionForIdentity(this.identity, strategy)
        .then(() => this.readStrategy())
        .then(() => { this.encryptionOpen = false })
        .catch(() => {})
    },

    openRename () {
      this.name = this.app.queries.nameForIdentity(this.identity)
      this.renameOpen = true
    },

    renameIdentity () {
      const name = this.name.trim()

      if (name) this.app.commands.renameIdentity(this.identity, name)

      this.renameOpen = false
    },

    useIdentity (identity) {
      this.switchOpen = false
      this.app.setIdentity(identity)
      this.$router.push('/')
    },

    addIdentity () {
      this.app.commands.addIdentity({})

      const identities = this.app.queries.allIdentities()

      this.useIdentity(identities[identities.length - 1])
    },

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
