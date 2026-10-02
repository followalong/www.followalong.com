// The hosted sync service this build signs in to. One install serves one
// product, so the address is a constant of the build and never a form field.
// VITE_HOSTED_URL points a local build at a service run on the same machine.
const HOSTED_URL = `${import.meta.env.VITE_HOSTED_URL || 'https://sync.followalong.com'}`.replace(/\/+$/, '')

const NOT_MODIFIED = 304
const OK = 200

// The same budget the bucket gets, for the same reason: the object is the
// whole log.
const TIMEOUT_MS = 60000

const HOLDS_KEYS = 'This identity\'s log holds the keys to your own storage, and an account\'s log can be read by the service. Remove S3 Storage, roll up this identity, then sign in again.'

// A bucket's keys are in the event that configured it, and stay there after
// the add-on is removed. Inside an article the quotes are escaped, so only
// the real field matches.
const holdsStorageKeys = (log) => `${log || ''}`.includes('"secretAccessKey"')

// The service names what went wrong in the body. Saying it back in the
// reader's words is the whole job here: "402" is not something anyone can act
// on, and the 402s want opposite acts.
const SAYS = {
  unauthorized: 'This device was signed out. Sign in again to keep syncing.',
  no_subscription: 'Your feeds are not syncing. Subscribe to keep them on every device.',
  subscription_expired: 'Your subscription has lapsed. Renew it to sync again.',
  account_cancelled: 'This account is closed, so syncing has stopped.',
  quota_exceeded: 'This account is out of space. Your feeds stay on this device.',
  email_required: 'An email address is required.',
  email_invalid: 'That does not look like an email address.',
  code_required: 'Enter the six digit code from your email.',
  // A wrong code answers the same whether or not the address has an account,
  // so this says the same too.
  bad_code: 'That code is not right. Ask for a new one and try again.',
  signin_disabled: 'This service is not taking sign ins right now.',
  mail_failed: 'We could not send that code. Try again in a minute.',
  already_subscribed: 'This account already has a subscription.',
  checkout_disabled: 'This service is not taking subscriptions right now.',
  checkout_failed: 'We could not start the checkout. Try again in a minute.',
  portal_disabled: 'This service cannot manage subscriptions right now.',
  portal_failed: 'We could not open your billing page. Try again in a minute.',
  // Stripe would not cancel, so the service stopped before erasing anything.
  delete_failed: 'We could not delete your account. Nothing was removed. Try again in a minute.'
}

const reason = (text) => {
  try {
    return JSON.parse(text).error || ''
  } catch {
    return ''
  }
}

// Retry-After is in seconds. A person reads minutes above a minute.
const when = (seconds) => {
  const wait = Number(seconds)

  if (!wait) return 'in a moment'
  if (wait < 60) return `in ${Math.round(wait)} seconds`

  return `in ${Math.round(wait / 60)} minutes`
}

const refusal = (response, text) => {
  const code = reason(text)
  const say = SAYS[code] ||
    (response.status === 401 && SAYS.unauthorized) ||
    (response.status === 402 && 'This account cannot sync right now.') ||
    (response.status === 413 && SAYS.quota_exceeded) ||
    (response.status === 428 && 'Every write has to name the copy it replaces.') ||
    (response.status === 429 && `Too many requests. Try again ${when(response.headers.get('retry-after'))}.`) ||
    `${response.status} ${code || 'request refused'}`

  return Object.assign(new Error(say), { status: response.status, reason: code })
}

// One request, with the timer armed over the answer rather than over the
// reading of it.
const send = (fetch, path, { method = 'GET', body, headers = {} } = {}) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  return new Promise((resolve) => resolve(fetch(`${HOSTED_URL}${path}`, { method, body, headers, signal: controller.signal })))
    .then(
      (response) => {
        clearTimeout(timer)

        return response
      },
      (e) => {
        clearTimeout(timer)

        if (controller.signal.aborted) throw new Error('The service did not answer in time')

        // A request that never left arrives as a bare TypeError. Passed on as
        // one, it would read as storage that cannot take a conditional write.
        throw e.name === 'TypeError' ? new Error('Could not reach the sync service. Check your connection.') : e
      }
    )
    .then((response) => {
      if (response.ok || response.status === NOT_MODIFIED) return response

      return response.text().then((text) => {
        throw refusal(response, text)
      })
    })
}

const authorized = (token) => ({ authorization: `Bearer ${token}` })

const parsed = (response) => response.text().then(JSON.parse)

const json = (fetch, path, body) => send(fetch, path, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body)
})

// Asks the service to mail a six digit code.
const sendCode = ({ fetch, email }) => json(fetch, '/v1/signin/codes', { email }).then(() => undefined)

// The code for a token. `device` is what the reader sees beside this device
// in their account.
const signIn = ({ fetch, email, code, device }) => json(fetch, '/v1/signin/tokens', { email, code, device }).then(parsed)

// A page to send the reader to. The service names the account from the token,
// so nothing here says whose it is.
const page = (path) => ({ fetch, token }) => send(fetch, path, { method: 'POST', headers: authorized(token) }).then(parsed).then((body) => body.url)

const checkout = page('/v1/checkout')
const portal = page('/v1/portal')

// The account the token names: its plan, its status and where it was bought.
const account = ({ fetch, token }) => send(fetch, '/v1/account', { headers: authorized(token) }).then(parsed)

// Erases the account, its log and the token itself.
const deleteAccount = ({ fetch, token }) => send(fetch, '/v1/account', { method: 'DELETE', headers: authorized(token) }).then(() => undefined)

// One account's log on the hosted service. The same shape the bucket adapter
// has, so the read, merge and conditional write do not know which they hold.
class HostedAdapter {
  // adapterOptions carries fetch: the browser's own, not the feed fetch.
  constructor (adapterOptions, addon) {
    this.id = addon.id
    this.data = Object.assign({}, addon.data)
    this.type = 'HostedAdapter'
    this.title = 'your account'

    for (const key in adapterOptions) {
      this[key] = adapterOptions[key]
    }
  }

  // Nothing to hand another device: it signs in for itself and is given a
  // token of its own, which this one cannot leak.
  portableData () {
    return {}
  }

  // The log goes up readable by the service, whatever password the identity
  // has: `encrypt` is not called. A second device finds the identity to adopt
  // by reading it.
  save (data, encrypt, headers = {}) {
    if (holdsStorageKeys(data)) return Promise.reject(new Error(HOLDS_KEYS))

    return this._send({ method: 'PUT', body: data, headers })
      .then((response) => ({ etag: response.headers.get('etag') || undefined }))
  }

  get (identity, decrypt, { etag } = {}) {
    return this._send({ headers: etag ? { 'if-none-match': etag } : {} })
      .then((response) => {
        if (response.status === NOT_MODIFIED) return { status: NOT_MODIFIED, body: '', etag }

        return response.text().then((body) => ({ status: OK, body, etag: response.headers.get('etag') || undefined }))
      })
  }

  _send ({ method, body, headers }) {
    return send(this.fetch, '/v1/log', { method, body, headers: Object.assign(authorized(this.data.token), headers) })
  }

  url () {
    return `${HOSTED_URL}/v1/log`
  }

  validate (data) {
    return !!data.token
  }
}

export { HOSTED_URL, HOLDS_KEYS, TIMEOUT_MS, holdsStorageKeys, sendCode, signIn, checkout, portal, account, deleteAccount }
export default HostedAdapter
