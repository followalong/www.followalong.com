<template>
  <PageBody>
    <Card :tone="sync.status === 'failed' ? 'danger' : sync.status === 'off' ? 'default' : 'success'">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h2
            :class="`text-sm font-bold ${
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
            {{ plural(contents.feeds, 'feed') }} ·
            {{ plural(contents.entries, 'entry', 'entries') }} ·
            {{ plural(contents.events, 'event') }} in the log
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
      </div>
    </Card>

    <Card :padded="false">
      <ListRow
        title="Name"
        :meta="app.queries.nameForIdentity(identity)"
        action
        aria-label="Rename identity"
        @click="openRename"
      />
      <ListRow
        title="Backup password"
        :meta="passwordMeta"
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
    </Card>

    <Card :padded="false">
      <ListRow
        title="Saved"
        :meta="savedCount ? `${plural(savedCount, 'entry', 'entries')} kept` : 'nothing saved yet'"
        to="/signals/saved"
        aria-label="Saved entries"
      />
      <ListRow
        title="Add-ons"
        :meta="`${addonCount} installed`"
        to="/add-ons"
        aria-label="Add-ons"
      />
      <ListRow
        title="Copy this identity"
        meta="feeds, saved items and settings"
        action
        aria-label="Copy identity"
        @click="copyIdentity"
      >
        <template #trailing>
          <span class="text-meta font-semibold text-primary flex-none">{{ copied ? 'Copied' : 'Copy' }}</span>
        </template>
      </ListRow>
      <ListRow
        title="Paste an identity"
        meta="a copy from another device"
        action
        aria-label="Paste identity"
        @click="restoreOpen = true"
      />
      <ListRow
        title="Roll up this identity"
        meta="clean up"
        action
        aria-label="Roll up identity"
        @click="rollUpIdentity"
      />
    </Card>

    <Card :padded="false">
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
    </Card>

    <button
      type="button"
      aria-label="Forget identity"
      class="bg-danger-bg border border-danger-border rounded-xl px-4 py-3.5 flex items-center justify-between gap-3 text-left"
      @click="forgetIdentity"
    >
      <span>
        <span class="block text-sm font-bold text-danger">Forget this identity</span>
        <span class="block text-meta text-ink-secondary mt-0.5">Removes all traces on this device</span>
      </span>
      <span class="text-meta font-semibold text-danger flex-none">Forget me</span>
    </button>

    <Sheet
      :open="encryptionOpen"
      title="Backup password"
      @close="encryptionOpen = false"
    >
      <p class="text-body text-ink-secondary">
        Backups are encrypted with this before they leave the device. It does
        not lock the app, and it does not encrypt what is stored here — this
        browser can always read its own copy.
      </p>
      <p
        v-if="sync.status === 'off'"
        class="text-body text-ink-secondary mt-2"
      >
        Nothing is being backed up yet, so this is not in use. It applies as
        soon as you set a backup up.
      </p>

      <Card
        :padded="false"
        class="mt-3"
      >
        <ListRow
          v-for="(label, key) in STRATEGY_LABELS"
          :key="key"
          :title="label"
          :meta="key === strategy ? 'in use' : STRATEGY_HINTS[key]"
          action
          :aria-label="`Encrypt with ${key}`"
          @click="changeEncryption(key)"
        />
      </Card>
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
        <TextField
          v-model="name"
          aria-label="Identity name"
          class="mt-3"
          placeholder="My Account"
        />
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
      <Card :padded="false">
        <ListRow
          v-for="option in identities"
          :key="option.id"
          :title="app.queries.nameForIdentity(option)"
          :meta="option.id === identity.id ? 'in use' : ''"
          action
          :aria-label="`Switch to ${app.queries.nameForIdentity(option)}`"
          @click="useIdentity(option)"
        />
      </Card>

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
      :open="restoreOpen"
      title="Paste an identity"
      @close="closeRestore"
    >
      <p class="text-body text-ink-secondary">
        Copy an identity from another device, then paste it here. It is added
        alongside what is already here — nothing is replaced.
      </p>

      <TextField
        v-model="pasted"
        multiline
        aria-label="Identity to paste"
        class="mt-3"
        placeholder="0/identities/…"
        :invalid="!!restoreError"
        :hint="restoreError"
      />

      <template #footer>
        <Button
          class="flex-1"
          aria-label="Restore identity"
          @click="restore"
        >
          Add it
        </Button>
      </template>
    </Sheet>
  </PageBody>
</template>

<script>
import ListRow from '../../components/list-row/component.vue'
import Sheet from '../../components/sheet/component.vue'
import Button from '../../components/button/component.vue'
import PageBody from '../../components/page-body/component.vue'
import Card from '../../components/card/component.vue'
import TextField from '../../components/text-field/component.vue'

const CHANGELOG_PATH = '/https://changelog.followalong.com/feed.xml'

const SYNC_TITLES = {
  off: 'Not backed up',
  idle: 'Backup configured',
  syncing: 'Backing up…',
  saved: 'Backed up',
  failed: 'Backup failed'
}

const STRATEGY_LABELS = {
  none: 'No password',
  ask: 'Ask me each time',
  store: 'Saved on this device'
}

const STRATEGY_HINTS = {
  none: 'backups go up readable',
  ask: 'asked once per session',
  store: 'no prompt, key kept here'
}

export default {
  components: {
    ListRow,
    Sheet,
    Button,
    PageBody,
    Card,
    TextField
  },

  props: ['app', 'identity'],

  data: () => ({
    CHANGELOG_PATH,
    restoreOpen: false,
    restoreError: '',
    pasted: '',
    encryptionOpen: false,
    strategy: 'none',
    STRATEGY_LABELS,
    SYNC_TITLES,
    now: Date.now(),
    STRATEGY_HINTS,
    renameOpen: false,
    switchOpen: false,
    name: '',
    copied: false
  }),

  computed: {
    sync () {
      return this.app.queries.syncStatusForIdentity(this.identity)
    },

    contents () {
      return this.app.queries.backupContentsForIdentity(this.identity)
    },

    // A password with nothing to protect yet should say so, rather than
    // sitting under"Not backed up" implying otherwise.
    passwordMeta () {
      const label = STRATEGY_LABELS[this.strategy]

      return this.sync.status === 'off' ? `${label} · not in use yet` : label
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

    savedCount () {
      return this.app.queries.savedEntriesForIdentity(this.identity).length
    },

    addonCount () {
      return this.app.queries.addonsForIdentity(this.identity).length
    }
  },

  mounted () {
    this.readStrategy()
  },

  methods: {
    plural (count, one, many) {
      return `${count} ${count === 1 ? one : (many || `${one}s`)}`
    },

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

    closeRestore () {
      this.restoreOpen = false
      this.restoreError = ''
      this.pasted = ''
    },

    restore () {
      this.restoreError = ''

      return this.app.commands.importIdentity(this.pasted)
        .then((identity) => {
          this.closeRestore()
          this.app.setIdentity(identity)
          this.$router.push('/')
        })
        .catch((e) => { this.restoreError = e.message })
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
