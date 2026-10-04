<template>
  <PageBody>
    <BackupCard
      :app="app"
      :identity="identity"
    >
      <template #details>
        <p class="text-meta text-ink-muted mt-1.5">
          {{ plural(contents.feeds, 'feed') }} ·
          {{ plural(contents.entries, 'entry', 'entries') }} ·
          {{ plural(contents.events, 'event') }} in the log
        </p>
      </template>

      <!-- Two targets, never both at once. An account is the one a reader is
 offered; a device syncing to a bucket is sent to the bucket's own page and
 offered no sign in. -->
      <AccountPanel
        v-if="account || sync.status === 'off'"
        :app="app"
        :identity="identity"
        @identity="app.setIdentity($event)"
      />
      <p
        v-if="!account"
        class="text-meta text-ink-muted mt-3"
      >
        <span v-if="sync.status !== 'off'">This device syncs to your own storage.</span>
        <router-link
          to="/storage"
          aria-label="Your own storage"
          class="underline"
        >
          {{ sync.status === 'off' ? 'Want to manage your own storage?' : 'Manage your own storage' }}
        </router-link>
      </p>
    </BackupCard>

    <Card :padded="false">
      <ListRow
        title="Name"
        :meta="app.queries.nameForIdentity(identity)"
        action
        aria-label="Rename identity"
        @click="openRename"
      />
      <ListRow
        v-if="!account"
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
        title="Set up another device"
        :meta="DEVICE_HINTS[kept]"
        action
        aria-label="Another device"
        @click="deviceOpen = true"
      />
      <ListRow
        title="Add-ons"
        :meta="`${addonCount} installed`"
        to="/add-ons"
        aria-label="Add-ons"
      />
      <ListRow
        title="Copy this identity"
        :meta="backupName ? 'everything, backup keys included' : 'feeds, saved items and settings'"
        :warn="!!backupName"
        action
        aria-label="Copy identity"
        @click="askToCopy"
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
        title="Save a copy to a file"
        :meta="backupName ? 'everything, backup keys included' : 'feeds, saved items and settings'"
        :warn="!!backupName"
        action
        aria-label="Save identity to a file"
        @click="saveOpen = true"
      >
        <template #trailing>
          <span class="text-meta font-semibold text-primary flex-none">{{ saved ? 'Saved' : 'Save' }}</span>
        </template>
      </ListRow>
      <ListRow
        title="Open a copy from a file"
        meta="a file saved on another device"
        action
        aria-label="Open identity from a file"
        @click="openOpen = true"
      />
      <ListRow
        title="Import feeds"
        meta="an OPML file from another reader"
        action
        aria-label="Import feeds"
        @click="importOpen = true"
      />
      <ListRow
        title="Roll up this identity"
        meta="fold the log into what it says now"
        action
        aria-label="Roll up identity"
        @click="rollUp"
      />
    </Card>

    <!-- The app cannot tell anyone it was killed while it was being killed,
 so it writes down every run and reports the ones that never finished. This
 stays on this device: it is one phone's noise, not part of the identity. -->
    <Card>
      <h2 class="text-sm font-bold text-ink">
        How this app has been behaving
      </h2>
      <p
        v-if="!restarts.length"
        class="text-meta text-ink-secondary mt-1"
      >
        Follow Along has not restarted on its own on this device. If it ever
        does, what happened will show up here.
      </p>
      <p
        v-else
        class="text-meta text-ink-secondary mt-1"
      >
        Follow Along closed and reopened by itself. That is usually the phone
        running out of memory and taking the app with it.
      </p>
    </Card>

    <Card
      v-if="restarts.length"
      :padded="false"
    >
      <ListRow
        v-if="restarts.length === 1"
        data-restart
        title="Restarted on its own"
        :meta="storyOf(restarts[0])"
      >
        <template #trailing>
          <span />
        </template>
      </ListRow>
      <ListRow
        v-else
        :title="`Restarted on its own ${restarts.length} times`"
        :meta="`last ${whenOf(restarts[0].at)}`"
        action
        aria-label="Show restarts"
        @click="restartsOpen = true"
      />
      <ListRow
        title="Forget these"
        meta="clears the list on this device"
        action
        aria-label="Forget restarts"
        @click="forgetRestarts"
      >
        <template #trailing>
          <span />
        </template>
      </ListRow>
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
        <span class="block text-sm font-bold text-danger">Forget {{ app.queries.nameForIdentity(identity) }}</span>
        <span class="block text-meta text-ink-secondary mt-0.5">Removes only this identity from this device. {{ forgetting }}</span>
      </span>
      <span class="text-meta font-semibold text-danger flex-none">Forget me</span>
    </button>

    <AnotherDevice
      :app="app"
      :identity="identity"
      :open="deviceOpen"
      @close="deviceOpen = false"
      @sign-in="goSignIn"
    />

    <Sheet
      :open="restartsOpen"
      title="Restarts"
      @close="restartsOpen = false"
    >
      <ListRow
        v-for="restart in restarts"
        :key="restart.at"
        data-restart
        title="Restarted on its own"
        :meta="storyOf(restart)"
      >
        <template #trailing>
          <span />
        </template>
      </ListRow>
    </Sheet>

    <Sheet
      :open="copyOpen"
      title="Copy this identity"
      @close="copyOpen = false"
    >
      <p class="text-body text-ink-secondary">
        This copies everything the identity has: its feeds, its saved items,
        and the keys to your backup at {{ backupName }}. The keys travel on
        purpose — without them the device you paste it into would look complete
        and quietly never back anything up.
      </p>

      <p class="mt-3 text-body text-danger">
        The clipboard is not private. Other apps can read it and clipboard
        managers keep a history, so paste this into the other device and then
        copy something else over it.
      </p>

      <template #footer>
        <Button
          class="flex-1"
          aria-label="Copy it"
          @click="copyIdentity"
        >
          Copy it
        </Button>
      </template>
    </Sheet>

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

    <Sheet
      :open="saveOpen"
      title="Save a copy to a file"
      @close="closeSave"
    >
      <p class="text-body text-ink-secondary">
        This saves your feeds, saved items and settings as one file. On the
        other device, use Open a copy from a file.
      </p>
      <p
        v-if="backupName"
        class="mt-3 text-body text-ink-secondary"
      >
        The file holds the keys to your storage at {{ backupName }}. With the
        keys, the other device keeps syncing.
      </p>

      <!-- The field hands its class to the input, so the gap above the label
 is the wrapper's. -->
      <div class="mt-4">
        <TextField
          v-model="filePassword"
          type="password"
          autocomplete="new-password"
          label="Password (optional)"
          aria-label="Password for the new file"
          :hint="filePassword ? 'You need this password to open the file. It is not kept anywhere.' : ''"
        />
      </div>

      <p
        v-if="!filePassword"
        class="mt-3 text-body text-danger"
      >
        Without a password, anyone who has the file can read it{{ backupName ? ' and use those keys' : '' }}.
      </p>
      <p
        v-if="saveError"
        class="mt-3 text-body text-danger"
      >
        {{ saveError }}
      </p>

      <template #footer>
        <Button
          class="flex-1"
          aria-label="Save the file"
          @click="saveIdentityFile"
        >
          Save the file
        </Button>
      </template>
    </Sheet>

    <Sheet
      :open="openOpen"
      title="Open a copy from a file"
      @close="closeOpen"
    >
      <p class="text-body text-ink-secondary">
        Choose a file that Save a copy to a file made. It is added alongside
        what is already here. Nothing is replaced.
      </p>

      <input
        type="file"
        aria-label="Choose a copy"
        class="block w-full mt-3 text-body text-ink"
        @change="readIdentityFile"
      >

      <div
        v-if="fileLocked"
        class="mt-4"
      >
        <TextField
          v-model="openPassword"
          type="password"
          autocomplete="off"
          label="Password"
          aria-label="Password for the file"
          hint="This file is protected with a password."
        />
      </div>

      <p
        v-if="openError"
        class="mt-3 text-body text-danger"
      >
        {{ openError }}
      </p>

      <template #footer>
        <Button
          class="flex-1"
          aria-label="Add the copy"
          @click="openIdentityFile"
        >
          Add it
        </Button>
      </template>
    </Sheet>

    <Sheet
      :open="importOpen"
      title="Import feeds from OPML"
      @close="closeImport"
    >
      <p class="text-body text-ink-secondary">
        Choose the OPML file another reader exported, or paste its contents.
        Each feed in it is followed here. Folders are not kept.
      </p>

      <input
        type="file"
        aria-label="Choose an OPML file"
        accept=".opml,.xml,text/xml,text/x-opml"
        class="block w-full mt-3 text-body text-ink"
        @change="readOpmlFile"
      >

      <TextField
        v-model="opml"
        multiline
        aria-label="OPML to import"
        class="mt-3"
        placeholder="<opml>…"
        :invalid="!!importError"
        :hint="importError || importReport"
      />

      <template #footer>
        <Button
          class="flex-1"
          aria-label="Follow these feeds"
          @click="importOpml"
        >
          Follow these feeds
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
import BackupCard from '../../components/backup-card/component.vue'
import AccountPanel from '../../components/account-panel/component.vue'
import AnotherDevice from '../../components/another-device/component.vue'
import kept from '../../components/another-device/kept.js'

const CHANGELOG_PATH = '/https://changelog.followalong.com/feed.xml'

const PLAYING_LABELS = {
  youtube: 'a YouTube video',
  video: 'a video',
  audio: 'a podcast'
}

const STRATEGY_LABELS = {
  none: 'No password',
  ask: 'Ask me each time',
  store: 'Saved on this device'
}

// What the row promises, by where this device keeps its feeds.
const DEVICE_HINTS = {
  bucket: 'show it a code to scan',
  account: 'sign in there with the same email',
  unpaid: 'once this account is paid',
  nowhere: 'this device is the only copy'
}

// What becomes of the copy kept elsewhere when this device forgets its own.
const FORGOTTEN = {
  bucket: 'The copy in your own storage stays. Nothing there is deleted.',
  account: 'The copy in your account stays. Nothing there is deleted.',
  unpaid: 'Your account is not paid. What it has not synced is gone for good.',
  nowhere: 'This device is the only copy. It is gone for good.'
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
    TextField,
    BackupCard,
    AccountPanel,
    AnotherDevice
  },

  props: ['app', 'identity'],

  data: () => ({
    CHANGELOG_PATH,
    restoreOpen: false,
    restoreError: '',
    pasted: '',
    importOpen: false,
    importError: '',
    importReport: '',
    opml: '',
    encryptionOpen: false,
    strategy: 'none',
    STRATEGY_LABELS,
    now: Date.now(),
    STRATEGY_HINTS,
    renameOpen: false,
    switchOpen: false,
    copyOpen: false,
    restartsOpen: false,
    deviceOpen: false,
    DEVICE_HINTS,
    name: '',
    copied: false,
    saveOpen: false,
    filePassword: '',
    saveError: '',
    saved: false,
    openOpen: false,
    fileText: null,
    openPassword: '',
    openError: ''
  }),

  computed: {
    restarts () {
      return this.app.queries.restartsForIdentity(this.identity)
    },

    sync () {
      return this.app.queries.syncStatusForIdentity(this.identity)
    },

    // The hosted account this device is signed in to, if it syncs to one. A
    // bucket takes over from an account, so the remote in use decides.
    account () {
      const remote = this.app.queries.remoteAdapterForIdentity(this.identity)

      return remote && !remote.data.bucket ? this.app.queries.accountForIdentity(this.identity) : null
    },

    kept () {
      return kept(this.app.queries, this.identity)
    },

    // What stays on this device, then what becomes of the copy elsewhere.
    forgetting () {
      const others = this.identities.length - 1
      const here = !others
        ? 'A new identity takes its place, following only the Changelog.'
        : others === 1 ? 'Your other identity stays.' : `Your ${others} other identities stay.`

      return `${here} ${FORGOTTEN[this.kept]}`
    },

    contents () {
      return this.app.queries.backupContentsForIdentity(this.identity)
    },

    // The copy carries the remote's configuration, credentials and all, so
    // where it goes decides whether the clipboard is holding secrets. An
    // identity with nowhere to back up to has none, and saying otherwise would
    // teach people to ignore the warning that matters.
    backupName () {
      const remote = this.app.queries.remoteAdapterForIdentity(this.identity)

      // An account's log holds no keys: the token never enters it.
      return (!this.account && remote && (remote.data.bucket || remote.title)) || ''
    },

    // A password with nothing to protect yet should say so, rather than
    // sitting under"Not backed up" implying otherwise.
    passwordMeta () {
      const label = STRATEGY_LABELS[this.strategy]

      return this.sync.status === 'off' ? `${label} · not in use yet` : label
    },

    identities () {
      return this.app.queries.allIdentities()
    },

    // A file that a password protects starts the way a bucket's copy does.
    fileLocked () {
      return `${this.fileText || ''}`.trim().startsWith('fa2:')
    },

    addonCount () {
      return this.app.queries.addonsForIdentity(this.identity).length
    }
  },

  mounted () {
    this.readStrategy()
  },

  methods: {
    // One line a reader can repeat back: when it happened, what was playing,
    // and how long the app had been open. Those three are what separate the
    // phone running out of memory from the app doing something to itself.
    storyOf (restart) {
      const parts = [this.whenOf(restart.at)]

      if (restart.playing) {
        parts.push(`playing ${PLAYING_LABELS[restart.playing.kind] || 'something'}, ${this.spanOf(restart.playedFor)} in`)
      } else {
        parts.push('nothing was playing')
      }

      parts.push(`open for ${this.spanOf(restart.lasted)}`)

      if (restart.wasSyncing) parts.push('during a backup')

      return parts.join(' · ')
    },

    whenOf (at) {
      const then = new Date(at)
      const time = then.toLocaleTimeString('en-us', { hour: 'numeric', minute: '2-digit' })

      if (new Date(this.now).toDateString() === then.toDateString()) return `Today at ${time}`

      return `${then.toLocaleDateString('en-us', { month: 'short', day: 'numeric' })} at ${time}`
    },

    spanOf (ms) {
      const seconds = Math.max(0, Math.round(ms / 1000))

      if (seconds < 60) return `${seconds} sec`
      if (seconds < 3600) return `${Math.round(seconds / 60)} min`

      return `${Math.round(seconds / 3600)} hr`
    },

    forgetRestarts () {
      return this.app.commands.forgetRestarts(this.identity)
    },

    plural (count, one, many) {
      return `${count} ${count === 1 ? one : (many || `${one}s`)}`
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

    // The sheet's Sign in: put the reader in the field that starts it.
    goSignIn () {
      this.deviceOpen = false

      const field = this.$el.querySelector('input[aria-label="Email"], input[aria-label="Code"]')

      if (field) field.focus()
    },

    askToCopy () {
      if (this.backupName) {
        this.copyOpen = true
        return
      }

      return this.copyIdentity()
    },

    copyIdentity () {
      this.copyOpen = false

      return Promise.resolve(this.app.commands.copyIdentityToClipboard(this.identity))
        .then(() => { this.copied = true })
        .catch(() => {})
    },

    // Everything the log says, folded into the one event that says it, and the
    // oldest read entries of a long feed let go of. It cannot be undone from
    // here, which is why it asks first.
    rollUp () {
      return this.app.confirm('Are you sure you want to roll up this identity?')
        .then(() => this.app.commands.createProjectionForIdentity(this.identity))
        .then(() => this.$router.push('/'))
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

    closeSave () {
      this.saveOpen = false
      this.saveError = ''
      this.filePassword = ''
    },

    saveIdentityFile () {
      this.saveError = ''

      return this.app.commands.identityFile(this.identity, this.filePassword)
        .then(({ name, text }) => this.app.saveFile(name, text))
        .then((left) => {
          if (!left) return

          this.saved = true
          this.closeSave()
        })
        .catch((e) => { this.saveError = e.message })
    },

    closeOpen () {
      this.openOpen = false
      this.openError = ''
      this.openPassword = ''
      this.fileText = null
    },

    readIdentityFile (e) {
      const file = e.target.files[0]

      this.openError = ''
      this.openPassword = ''
      this.fileText = null

      if (!file) return

      return file.text().then((text) => { this.fileText = text })
    },

    openIdentityFile () {
      if (this.fileText === null) {
        this.openError = 'Choose a file first.'
        return
      }

      this.openError = ''

      return this.app.commands.openIdentityFile(this.fileText, this.openPassword)
        .then((identity) => {
          this.closeOpen()
          this.app.setIdentity(identity)
          this.$router.push('/')
        })
        .catch((e) => { this.openError = e.message })
    },

    closeImport () {
      this.importOpen = false
      this.importError = ''
      this.importReport = ''
      this.opml = ''
    },

    readOpmlFile (e) {
      const file = e.target.files[0]

      if (!file) return

      return file.text().then((text) => { this.opml = text })
    },

    importOpml () {
      this.importError = ''
      this.importReport = ''

      try {
        const { followed, skipped } = this.app.commands.importOpmlForIdentity(this.identity, this.opml)

        this.importReport = `Followed ${this.plural(followed, 'feed')}${skipped ? `, ${skipped} already followed` : ''}`
        this.opml = ''
      } catch (e) {
        this.importError = e.message
      }
    },

    forgetIdentity () {
      this.app.confirm(`Forget ${this.app.queries.nameForIdentity(this.identity)}? This removes only this identity from this device. ${this.forgetting}`)
        .then(() => this.app.commands.forgetIdentity(this.identity))
        .then(() => this.app.setIdentity(this.app.queries.allIdentities()[0]))
        .then(() => this.$router.push('/'))
        .catch(() => {})
    }
  }
}
</script>
