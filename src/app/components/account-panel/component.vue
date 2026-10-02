<template>
  <div class="mt-3 flex flex-col gap-3">
    <template v-if="account">
      <p
        v-if="paid"
        class="text-meta text-ink-secondary"
      >
        Your subscription is active.
      </p>
      <div
        v-if="manageable || selling || restorable"
        class="flex flex-wrap gap-2"
      >
        <template v-if="inApp && selling">
          <Button
            v-for="product in products"
            :key="product.id"
            :aria-label="`${verb}, ${product.displayPrice} a ${product.every}`"
            class="!py-1.5 !px-3 !text-chip"
            @click="buy(product)"
          >
            {{ verb }}, {{ product.displayPrice }} a {{ product.every }}
          </Button>
          <Button
            v-if="!products.length"
            :aria-label="verb"
            class="!py-1.5 !px-3 !text-chip"
            @click="buy()"
          >
            {{ verb }}
          </Button>
        </template>
        <Button
          v-else-if="selling"
          :aria-label="verb"
          class="!py-1.5 !px-3 !text-chip"
          @click="subscribe"
        >
          {{ verb }}
        </Button>
        <Button
          v-if="restorable"
          variant="secondary"
          aria-label="Restore purchases"
          class="!py-1.5 !px-3 !text-chip"
          @click="restore"
        >
          Restore purchases
        </Button>
        <Button
          v-if="manageable"
          variant="secondary"
          aria-label="Manage subscription"
          class="!py-1.5 !px-3 !text-chip"
          @click="manage"
        >
          Manage subscription
        </Button>
      </div>

      <p class="text-meta text-ink-secondary">
        Signed in as {{ account.email }}.
      </p>
      <div class="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          aria-label="Sign out"
          class="!py-1.5 !px-3 !text-chip"
          @click="signOut"
        >
          Sign out
        </Button>
        <Button
          variant="destructive"
          aria-label="Delete account"
          class="!py-1.5 !px-3 !text-chip"
          @click="deleteAccount"
        >
          Delete account
        </Button>
      </div>
    </template>

    <form
      v-else-if="!sent"
      class="flex flex-col gap-3"
      @submit.prevent="sendCode"
    >
      <p class="text-meta text-ink-secondary">
        Sign in to keep your feeds on every device.
      </p>
      <TextField
        v-model="email"
        type="email"
        autocomplete="email"
        aria-label="Email"
        placeholder="you@example.com"
      />
      <div class="flex gap-2">
        <Button
          aria-label="Send code"
          class="!py-1.5 !px-3 !text-chip"
          @click="sendCode"
        >
          {{ working ? 'Sending…' : 'Send code' }}
        </Button>
      </div>
    </form>

    <form
      v-else
      class="flex flex-col gap-3"
      @submit.prevent="signIn"
    >
      <p class="text-meta text-ink-secondary">
        We sent a six digit code to {{ email }}.
      </p>
      <TextField
        v-model="code"
        inputmode="numeric"
        autocomplete="one-time-code"
        aria-label="Code"
        placeholder="123456"
      />
      <div class="flex flex-wrap gap-2">
        <Button
          aria-label="Sign in"
          class="!py-1.5 !px-3 !text-chip"
          @click="signIn"
        >
          {{ working ? 'Signing in…' : 'Sign in' }}
        </Button>
        <Button
          variant="secondary"
          aria-label="Send another code"
          class="!py-1.5 !px-3 !text-chip"
          @click="sendCode"
        >
          Send another code
        </Button>
        <Button
          variant="secondary"
          aria-label="Use a different email"
          class="!py-1.5 !px-3 !text-chip"
          @click="startOver"
        >
          Use a different email
        </Button>
      </div>
    </form>

    <p
      v-if="said"
      class="text-meta text-danger"
    >
      {{ said }}
    </p>
    <p
      v-if="notice"
      class="text-meta text-ink-secondary"
    >
      {{ notice }}
    </p>
  </div>
</template>

<script>
import Button from '../button/component.vue'
import TextField from '../text-field/component.vue'

// What the reader sees beside this device in their account.
const deviceName = () => (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || 'This device'

// The webhook reaches the service within seconds of paying, and a checkout
// left open longer than a quarter of an hour has been abandoned.
const POLL_MS = 5000
const POLLS = 180

// The hosted account: an email, then the six digit code mailed to it. A code
// and not a link, so it works wherever the app is installed. Signed in, what
// the account is paid up for and the ways to change that. In the iOS build
// the App Store sells it and the web checkout is never linked to (guideline
// 3.1.1).
export default {
  components: { Button, TextField },

  props: ['app', 'identity'],

  emits: ['identity'],

  data: () => ({
    email: '',
    code: '',
    sent: false,
    working: false,
    error: '',
    notice: '',
    // The account as the service last answered it, and what the App Store
    // sells.
    held: null,
    products: []
  }),

  computed: {
    inApp () {
      return !!this.app.storekit
    },

    account () {
      return this.app.queries.accountForIdentity(this.identity)
    },

    sync () {
      return this.app.queries.syncStatusForIdentity(this.identity)
    },

    // What this form was told, else what the service signed the device out
    // with.
    said () {
      return this.error || (this.account ? '' : this.sync.error)
    },

    // Paid up now. Never paid is written as the epoch, so it reads as long
    // past.
    paid () {
      const held = this.held

      return !!held && held.status === 'active' && (!held.expires_at || Date.parse(held.expires_at) > Date.now())
    },

    // A lapse is something to fix; a closed account is not, so only the lapse
    // is offered a way back.
    renewable () {
      return !this.paid && this.sync.reason === 'subscription_expired'
    },

    buyable () {
      return !this.paid && !this.renewable && this.sync.reason !== 'account_cancelled' && (!!this.held || this.sync.reason === 'no_subscription')
    },

    selling () {
      return this.renewable || this.buyable
    },

    verb () {
      return this.renewable ? 'Renew' : 'Subscribe'
    },

    // The Apple Account may hold a subscription this account has not heard of.
    restorable () {
      return this.inApp && !this.paid
    },

    // Only the storefront that sold it can manage it: the App Store there,
    // the billing page here.
    manageable () {
      return !!this.held && (this.inApp ? this.paid && this.held.source === 'apple' : this.held.source === 'stripe')
    }
  },

  watch: {
    // Asked again whenever the service changes its mind about the log, which
    // is when the plan beside it has changed too.
    'sync.reason': { immediate: true, handler: 'shop' },
    'account.token': 'shop'
  },

  created () {
    this.restock()
  },

  unmounted () {
    clearInterval(this.polling)
  },

  methods: {
    run (ask) {
      this.working = true
      this.error = ''
      this.notice = ''

      return Promise.resolve()
        .then(ask)
        .catch((e) => { this.error = e.message })
        .then(() => { this.working = false })
    },

    sendCode () {
      return this.run(() => this.app.commands.sendAccountCode(this.identity, this.email)
        .then(() => { this.sent = true }))
    },

    // The account's log may name an identity this device does not read yet,
    // so the page is told which one it now holds.
    signIn () {
      return this.run(() => this.app.commands.signInToAccount(this.identity, { email: this.email, code: this.code, device: deviceName() })
        .then((identity) => {
          this.startOver()
          this.$emit('identity', identity)
        }))
    },

    // Quiet: the plan is a courtesy beside a sync that says its own piece.
    shop () {
      if (!this.account) {
        this.held = null

        return
      }

      return this.app.commands.accountDetailsForIdentity(this.identity)
        .then((held) => { this.held = held }, () => {})
    },

    // Opened beside the app rather than navigated to, so a reader who leaves
    // that page still has the app where they left it.
    visit (ask, name) {
      return this.run(() => ask().then((url) => {
        if (!this.app.openPage(url)) throw new Error(`We could not open the ${name} page. Allow pop-ups for this site and try again.`)
      }))
    },

    // The service hears of a payment from the storefront, never from the app,
    // so it is asked until the account is paid, and then the log goes up.
    subscribe () {
      return this.visit(() => this.app.commands.checkoutForIdentity(this.identity), 'checkout').then(() => {
        let left = POLLS

        clearInterval(this.polling)

        this.polling = setInterval(() => {
          if (!--left || this.paid || !this.account) return clearInterval(this.polling)

          Promise.resolve(this.shop()).then(() => this.paid && this.app.commands.syncIdentity(this.identity))
        }, POLL_MS)
      })
    },

    // Quiet, and only what the store answers: an empty shelf is a plain
    // Subscribe that asks again.
    restock () {
      return this.app.commands.subscriptionProducts().then((products) => { this.products = products })
    },

    // The App Store's purchase sheet. Closing it is the reader's own act, so
    // it is answered with nothing.
    buy (product) {
      if (!product) {
        return this.run(() => this.restock().then(() => {
          if (!this.products.length) throw new Error('Subscriptions are not available right now. Try again later.')
        }))
      }

      return this.run(() => this.app.commands.purchaseSubscriptionForIdentity(this.identity, product.id).then(({ status, account }) => {
        if (account) return this.took(account)
        if (status === 'pending') this.notice = 'Your purchase is waiting for approval. Sync starts once it is approved.'
      }))
    },

    restore () {
      return this.run(() => this.app.commands.restorePurchasesForIdentity(this.identity).then((account) => this.took(account)).then(() => {
        if (!this.paid) this.notice = 'This Apple Account has no subscription to restore.'
      }))
    },

    // A paid account can sync again, and the refusal on screen goes the
    // moment it does.
    took (held) {
      this.held = held

      if (this.paid) return this.app.commands.syncIdentity(this.identity)
    },

    manage () {
      if (this.inApp) return this.run(() => this.app.storekit.manage())

      return this.visit(() => this.app.commands.billingPageForIdentity(this.identity), 'billing')
    },

    deleteAccount () {
      const cancels = this.paid && this.held.source === 'stripe' ? ' Your subscription is cancelled at once.' : ''

      return this.app.confirm(`Delete your account? This erases the account, its email address and the synced copy of your feeds from the sync service. Your feeds stay on this device. This cannot be undone.${cancels}`)
        .then(
          () => this.run(() => this.app.commands.deleteAccountForIdentity(this.identity).then(() => {
            this.startOver()
            this.notice = 'Your account was deleted. Your feeds stay on this device.'
          })),
          () => {}
        )
    },

    startOver () {
      this.sent = false
      this.code = ''
      this.error = ''
    },

    signOut () {
      return this.app.confirm('Sign out of this device? Your feeds stay on this device and in your account.')
        .then(() => this.app.commands.signOutOfAccount(this.identity))
        .then(() => this.startOver())
        .catch(() => {})
    }
  }
}
</script>
