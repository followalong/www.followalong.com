import HostedAdapter, { HOLDS_KEYS, holdsStorageKeys, sendCode, signIn, account, checkout, portal, deleteAccount, appleTransaction } from '../adapters/hosted.js'
import { shelf } from '../adapters/storekit.js'
import { DEFAULT_ADDONS } from './seed.js'

// The log's own keys are written against the identity that made it, so a log
// read from elsewhere says which identity it belongs to. A rolled-up log has
// no create left, only the rollup.
const IDENTITY_IN_LOG = /\/identities\/([^/\s]+)\/(?:create|rollup)/

// The account is there but the service will not read it for this device
// until it is paid again. Never paid is not this: it was never written.
const SHUT = (e) => !!e && (e.reason === 'subscription_expired' || e.reason === 'account_cancelled')

// The hosted account, mixed into Commands. Everything about it lives in the
// identity's config on this device and never in the log: the log is what
// every device and the service read, and a token belongs to one device.
export default {
  // Refused before anything is mailed: the service can read an account's log,
  // and this one says how to get into a bucket.
  _refuseALogWithStorageKeys (identity) {
    return holdsStorageKeys(this.queries.eventsToFile(identity)) ? Promise.reject(new Error(HOLDS_KEYS)) : Promise.resolve()
  },

  sendAccountCode (identity, email) {
    return this._refuseALogWithStorageKeys(identity)
      .then(() => this.state.updateConfig(identity.id, { accountError: '' }))
      .then(() => sendCode({ fetch: this.hostedFetch, email }))
  },

  // Answers with the identity this device reads from now on.
  signInToAccount (identity, { email, code, device }) {
    return this._refuseALogWithStorageKeys(identity)
      .then(() => signIn({ fetch: this.hostedFetch, email, code, device }))
      .then(({ id, token }) => {
        const account = { email, accountId: id, token }

        // Before the first read, so a subscription this Apple Account
        // already holds lets it through.
        return this._postEntitlements(account).catch(() => {})
          .then(() => this._identityOfAccount(identity, account))
          .catch((e) => {
            if (!SHUT(e)) throw e

            // Signed in all the same, to this device's own identity. The
            // account's log is taken over once it is paid.
            account.pending = e.reason

            return identity
          })
          .then((signed) => {
            // A different target is one this device has never read.
            this.state.updateConfig(signed.id, { account, accountError: '', remoteEtag: null, remoteFingerprint: null })

            // Signed in once the token is kept. What the first sync met is
            // the status line's to tell.
            return this.syncIdentity(signed).then(() => signed)
          })
      })
  },

  // The only flight while the account is not paid up: the takeover read, and
  // nothing goes up. Once it lands the device reads the account's identity
  // from now on, and the one it signed in with is signed out behind it
  // (unless it held nothing and is being forgotten). Answers the identity.
  _completeTakeover (identity, account) {
    return this._identityOfAccount(identity, account).then((signed) => {
      const { pending, ...paid } = account

      this.state.updateConfig(signed.id, { account: paid, accountError: '', remoteEtag: null, remoteFingerprint: null })

      if (signed.id !== identity.id) {
        if (!this._holdsNothingElse(identity)) this.signOutOfAccount(identity)
        if (this.onAdopt) this.onAdopt(signed)
      }

      return signed
    })
  },

  // An account that already holds a log names the identity it was written
  // against, and a second device has to take that id: events imported under
  // any other belong to nobody.
  _identityOfAccount (identity, account) {
    return new HostedAdapter({ fetch: this.hostedFetch }, { data: account }).get().then(
      ({ body }) => {
        const found = `${body}`.match(IDENTITY_IN_LOG)

        return !found || found[1] === identity.id ? identity : this._adoptIdentity(found[1], body, identity)
      },
      // Nothing up there yet: this device is the first, and its own identity
      // is the account's. An account that never paid was never written, and
      // the service refuses even the read.
      (e) => {
        if (e.status === 404 || e.reason === 'no_subscription') return identity

        throw e
      }
    )
  },

  // The feeds this device followed come along, by address, so one the
  // account already follows is not followed twice and a second sign in
  // brings nothing new.
  _adoptIdentity (id, body, from) {
    if (!this.queries.allIdentities().some((held) => held.id === id)) {
      this.state.createDB(id, {})
      this.keychain.addNone(id)
    }

    return Promise.resolve(this.state.importRaw(id, body)).then(() => {
      const adopted = this.queries.allIdentities().find((held) => held.id === id)

      this.mergeDuplicateEntriesForIdentity(adopted)
      this.followFeedsForIdentity(adopted, this.queries.feedsForIdentity(from).map((feed) => ({
        url: this.queries.urlForFeed(feed),
        title: this.queries.titleForFeed(feed)
      })))

      // Not waited for: deleting a database waits on every other tab that
      // has it open. Memory and config go at once.
      if (this._holdsNothingElse(from)) this.forgetIdentity(from).catch(() => {})

      return adopted
    })
  },

  // Its feeds came along, so what is left to lose is what the reader chose
  // to keep or to install.
  _holdsNothingElse (identity) {
    return !this.queries.savedEntriesForIdentity(identity).length &&
      this.queries.addonsForIdentity(identity).every((addon) => DEFAULT_ADDONS.some((seeded) => seeded.type === addon.type))
  },

  _asAccount (identity) {
    return { fetch: this.hostedFetch, token: (this.queries.accountForIdentity(identity) || {}).token }
  },

  // The account as the service holds it: plan, status, and where it was
  // bought.
  accountDetailsForIdentity (identity) {
    return account(this._asAccount(identity))
  },

  // Where to send a reader who wants to pay, and where one who has paid
  // manages what they bought.
  checkoutForIdentity (identity) {
    return checkout(this._asAccount(identity))
  },

  billingPageForIdentity (identity) {
    return portal(this._asAccount(identity))
  },

  // What the App Store sells, priced for the reader. Empty off the iOS build.
  subscriptionProducts () {
    return this.storekit ? shelf(this.storekit) : Promise.resolve([])
  },

  // One App Store purchase, bought for this account: the service reads the
  // account id back out of Apple's signed transaction. Answers { status },
  // and the account once one was bought.
  purchaseSubscriptionForIdentity (identity, productId) {
    const held = this.queries.accountForIdentity(identity)

    return this.storekit.purchase(productId, held.accountId).then(({ status, signedTransaction }) =>
      status === 'purchased' ? this._postTransaction(held, signedTransaction).then((account) => ({ status, account })) : { status })
  },

  // Everything this Apple Account holds goes to the service. A renewal, or a
  // purchase made while offline, is otherwise never heard of there.
  restorePurchasesForIdentity (identity) {
    return this._postEntitlements(this.queries.accountForIdentity(identity)).then(() => this.accountDetailsForIdentity(identity))
  },

  _postEntitlements (held) {
    if (!this.storekit || !held) return Promise.resolve([])

    return this.storekit.entitlements().then((signed) => Promise.all(signed.map((jws) => this._postTransaction(held, jws))))
  },

  _postTransaction ({ token }, signedTransaction) {
    return appleTransaction({ fetch: this.hostedFetch, token, signedTransaction })
  },

  // Erases the account on the service, then forgets it here as signing out
  // does. A refusal leaves this device signed in, since nothing was erased.
  deleteAccountForIdentity (identity) {
    return deleteAccount(this._asAccount(identity)).then(() => this.signOutOfAccount(identity))
  },

  // Leaves the account and the feeds as they are. `because` is what the
  // reader is told when it was not their own doing.
  signOutOfAccount (identity, because = '') {
    return this.state.updateConfig(identity.id, { account: null, accountError: because, remoteEtag: null, remoteFingerprint: null, syncStatus: 'off', syncError: '', syncReason: '' })
  }
}
