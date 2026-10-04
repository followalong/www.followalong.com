<template>
  <Sheet
    :open="open"
    title="Set up another device"
    @close="$emit('close')"
  >
    <template v-if="kept === 'bucket'">
      <p class="text-body text-ink-secondary">
        Point the other device's camera at this. It opens Follow Along there
        and pulls this identity down from your backup, so nothing has to be
        typed or pasted.
      </p>

      <QrCode
        v-if="link"
        :value="link"
        alt="Setup code"
        aria-label="Setup code"
        class="mt-4"
      />

      <p class="mt-4 text-body text-danger">
        Anyone who scans this can read your backup. Show it to your own camera,
        do not photograph it for anyone else.
      </p>

      <TextField
        :model-value="link"
        readonly
        multiline
        :rows="3"
        aria-label="Handoff link"
        class="mt-3"
        hint="The same thing as a link, for a device that cannot scan."
      />

      <p
        v-if="error"
        class="mt-3 text-body text-danger"
      >
        {{ error }}
      </p>
    </template>

    <p
      v-else-if="kept === 'account'"
      class="text-body text-ink-secondary"
    >
      Sign in on the other device with {{ account.email }}. It picks up these
      feeds.
    </p>

    <p
      v-else-if="kept === 'unpaid'"
      class="text-body text-ink-secondary"
    >
      The other device can sign in with {{ account.email }} once this account
      is paid.
    </p>

    <template v-else>
      <p class="text-body text-ink-secondary">
        This device is the only copy of your feeds. To set up another device,
        sign in or connect your own storage.
      </p>
      <p class="mt-3 text-meta text-ink-muted">
        Or use Copy this identity here, then Paste an identity on the other
        device.
      </p>
    </template>

    <template
      v-if="kept === 'bucket'"
      #footer
    >
      <Button
        class="flex-1"
        variant="secondary"
        aria-label="Copy setup link"
        @click="copy"
      >
        {{ copied ? 'Copied' : 'Copy the link' }}
      </Button>
    </template>
    <template
      v-else-if="kept === 'nowhere'"
      #footer
    >
      <Button
        class="flex-1"
        aria-label="Sign in on this device"
        @click="$emit('sign-in')"
      >
        Sign in
      </Button>
      <Button
        class="flex-1"
        variant="secondary"
        aria-label="Connect your own storage"
        @click="$router.push('/storage')"
      >
        Connect your own storage
      </Button>
    </template>
  </Sheet>
</template>

<script>
import Sheet from '../sheet/component.vue'
import Button from '../button/component.vue'
import TextField from '../text-field/component.vue'
import QrCode from '../qr-code/component.vue'
import kept from './kept.js'
import { PUBLIC_URL } from '../../../queries/public-url.js'

// Another device opens the setup link in its browser. The native app's own
// address (tauri://localhost) opens nothing there.
const appUrl = () => /^https?:/.test(window.location.origin) ? window.location.origin : PUBLIC_URL

// How another device gets these feeds, which depends on where this device
// keeps them: a bucket hands out a code, an account is signed in to, and a
// device that keeps them nowhere is told so.
export default {
  components: { Sheet, Button, TextField, QrCode },

  props: {
    app: { type: Object, required: true },
    identity: { type: Object, default: null },
    open: { type: Boolean, default: false }
  },

  emits: ['close', 'sign-in'],

  data: () => ({ link: '', error: '', copied: false }),

  computed: {
    account () {
      return this.app.queries.accountForIdentity(this.identity)
    },

    kept () {
      return kept(this.app.queries, this.identity)
    }
  },

  watch: {
    open: {
      immediate: true,
      handler (open) {
        if (!open) return

        this.error = ''
        this.copied = false

        if (this.kept !== 'bucket') return

        return this.app.commands.handoffForIdentity(this.identity)
          .then((setup) => { this.link = setup ? `${appUrl()}/#${setup}` : '' })
          .catch((e) => { this.error = e.message })
      }
    }
  },

  methods: {
    copy () {
      return Promise.resolve(this.app.commands.copyToClipboard(this.link))
        .then(() => { this.copied = true })
        .catch(() => {})
    }
  }
}
</script>
