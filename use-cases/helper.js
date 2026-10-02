/* eslint no-async-promise-executor: 0 */

import { mount, flushPromises } from '@vue/test-utils'
import { vi, describe, test } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { routes } from '../src/app/router/index.js'
import runners from '../src/state/runners.js'
import MultiEventStore from '../src/state/multi-event-store.js'
import App from '../src/app/component.vue'
import { PRODUCTS } from '../src/adapters/storekit.js'

const mountApp = (options) => {
  return new Promise(async (resolve) => {
    options = options || {}

    // Handing back a store from an earlier mount is how a spec says "the app
    // started again on the same device" -- everything the device already held
    // is still there, which is the whole point of anything that survives a
    // restart.
    const store = options.store || new MultiEventStore(Math.random(), 'v2.1', runners)

    if (!options.store) {
      await store.clear()

      if (options.state) {
        for (const id in options.state) {
          const identity = options.state[id]

          store.createDB(id, identity.config)
          await store.importRaw(id, identity.data)
        }
      }
    }

    const router = createRouter({
      history: createMemoryHistory(),
      routes
    })

    router.push(options.path || '/')

    await router.isReady()

    const app = await mount(App, {
      global: {
        plugins: [router]
      },
      propsData: {
        fetch: options.fetch || responses(['']),
        state: store,
        confirm: options.confirm || vi.fn().mockResolvedValue(),
        automaticFetch: options.automaticFetch || false,
        scrollTo: options.scrollTo || vi.fn(),
        prompt: options.prompt || vi.fn(),
        keychainName: `keychain-${Math.random()}`,
        copyToClipboard: options.copyToClipboard || vi.fn(),
        handoffHash: options.handoffHash || '',
        wakeLock: options.wakeLock || { hold: vi.fn(), release: vi.fn() },
        // No clock: `wait` runs every timer there is, and an interval never
        // runs out of them.
        pullEveryMs: 0,
        pullGapMs: options.pullGapMs || 0,
        awsClient: options.awsClient || (() => ({ fetch: () => Promise.resolve(s3Response({ status: 404, body: '<Error><Code>NoSuchKey</Code></Error>' })) })),
        hostedFetch: options.hostedFetch || (() => Promise.reject(new TypeError('Failed to fetch'))),
        openPage: options.openPage || vi.fn(() => true),
        // The web, unless a spec hands it the iOS build's App Store.
        storekit: options.storekit || null
      }
    })

    app.click = async (el) => {
      let $el = null

      try {
        $el = await app.find(el)
      } catch (e) { }

      if (!Object.keys($el).length) {
        throw new Error(`Could not find element: ${el} in ${app.text()}`)
      }

      await $el.trigger('click')
      await app.wait()
    }

    app.submit = async (el) => {
      let $el = null

      try {
        $el = await app.find(el)
      } catch (e) { }

      if (!Object.keys($el).length) {
        throw new Error(`Could not find element: ${el} in ${app.text()}`)
      }

      await $el.trigger('submit')
      await app.wait()
    }

    app.wait = async () => {
      await flushPromisesAndTimers()
    }

    await app.wait()

    resolve(app)
  })
}

vi.useFakeTimers()

const flushPromisesAndTimers = () => {
  vi.runAllTimers()
  return flushPromises()
}

// What the browser hands back from a request, as much of it as the adapters
// touch.
const s3Response = ({ status = 200, body = '', headers = {} }) => ({
  ok: status >= 200 && status < 300,
  status,
  text: () => Promise.resolve(body),
  headers: { get: (name) => headers[name.toLowerCase()] ?? null }
})

// A bucket that answers signed requests the way S3 does: keyed by the URL the
// adapter built, so a request to the wrong host or the wrong key misses
// exactly as a real one would, with a new ETag on every write and a 412 for a
// write whose condition does not hold. `answer` takes it over for a spec that
// wants a refusal or a hang.
const s3Bucket = ({ answer, objects = {} } = {}) => {
  const bucket = {
    requests: [],
    objects: Object.assign({}, objects),
    etags: {},
    version: 0,
    answer
  }

  bucket.of = (request) => `${request.url}`

  bucket.etagOf = (key) => typeof bucket.objects[key] === 'undefined' ? undefined : bucket.etags[key] || '"v0"'

  bucket.store = (request) => {
    const key = bucket.of(request)
    const held = bucket.etagOf(key)

    if ((request.headers['if-match'] && request.headers['if-match'] !== held) || (request.headers['if-none-match'] === '*' && held)) {
      return s3Response({ status: 412, body: '<Error><Code>PreconditionFailed</Code></Error>' })
    }

    bucket.objects[key] = `${request.body}`
    bucket.etags[key] = `"v${++bucket.version}"`

    return s3Response({ headers: { etag: bucket.etags[key] } })
  }

  bucket.read = (request) => {
    const key = bucket.of(request)

    if (typeof bucket.objects[key] === 'undefined') {
      return s3Response({ status: 404, body: '<Error><Code>NoSuchKey</Code></Error>' })
    }

    if (request.headers['if-none-match'] === bucket.etagOf(key)) {
      return s3Response({ status: 304 })
    }

    return s3Response({ status: 200, body: bucket.objects[key], headers: { etag: bucket.etagOf(key) } })
  }

  bucket.client = (config) => ({
    fetch: (url, init = {}) => {
      const request = { url: `${url}`, method: init.method || 'GET', body: init.body, headers: init.headers || {}, config }

      bucket.requests.push(request)

      if (bucket.answer) {
        return Promise.resolve(bucket.answer(request))
      }

      return Promise.resolve(request.method === 'PUT' ? bucket.store(request) : bucket.read(request))
    }
  })

  // The one object almost every spec has: whatever was last written, wherever
  // it went.
  bucket.body = () => Object.values(bucket.objects)[0] || null
  bucket.reads = () => bucket.requests.filter((r) => r.method === 'GET')
  bucket.writes = () => bucket.requests.filter((r) => r.method === 'PUT')

  return bucket
}

// The hosted service, as far as the app can tell: accounts by email, one log
// each, a new ETag on every write, a write refused unless it names the copy it
// replaces, and a code by email to get a token. `refuse` answers every
// /v1/log request with what a spec puts there, `refuseWrites` only the writes.
// `subscribed` and `source` are what /v1/account says; `portal`, `remove` and
// `apple` make those requests answer a given refusal.
const hostedService = () => {
  const service = { accounts: new Map(), requests: [], code: '123456', writes: 0, refuse: null, refuseWrites: null, subscribed: true, source: 'stripe', portal: null, remove: null, apple: null, transactions: [] }

  const answer = ({ etag, ...rest }) => s3Response(Object.assign(rest, { headers: Object.assign({ etag }, rest.headers) }))

  // The account as /v1/account shows it. Never paid is the epoch, as the
  // service writes it.
  const view = (held) => JSON.stringify({
    id: held.id,
    plan: service.subscribed ? 'plus' : 'none',
    status: 'active',
    source: service.subscribed ? service.source : 'manual',
    expires_at: service.subscribed ? '2099-01-01T00:00:00Z' : '1970-01-01T00:00:00Z'
  })

  const signin = (path, sent) => {
    if (path === '/v1/signin/codes') {
      if (!sent.email) return answer({ status: 400, body: '{"error":"email_required"}' })
      if (!/@/.test(sent.email)) return answer({ status: 400, body: '{"error":"email_invalid"}' })

      return answer({ status: 202, body: '{"result":"sent"}' })
    }

    // A wrong code answers the same whether or not the address has an account.
    if (sent.code !== service.code) return answer({ status: 401, body: '{"error":"bad_code"}' })

    if (!service.accounts.has(sent.email)) service.accounts.set(sent.email, { id: `acc_${service.accounts.size + 1}`, log: null })

    return answer({ status: 201, body: JSON.stringify({ id: service.accounts.get(sent.email).id, token: `tok_${sent.email}` }) })
  }

  const respond = (path, { method = 'GET', body, headers = {} }) => {
    if (path.startsWith('/v1/signin/')) return signin(path, JSON.parse(body))

    const held = service.accounts.get(`${headers.authorization || ''}`.replace('Bearer tok_', ''))

    if (!held) return answer({ status: 401, body: '{"error":"unauthorized"}' })

    if (path === '/v1/checkout') {
      if (service.subscribed) return answer({ status: 409, body: '{"error":"already_subscribed"}' })

      return answer({ status: 201, body: '{"url":"https://checkout.stripe.com/c/pay/cs_1"}' })
    }

    if (path === '/v1/portal') {
      if (service.portal) return answer(service.portal)
      if (service.source !== 'stripe') return answer({ status: 409, body: '{"error":"no_subscription"}' })

      return answer({ status: 201, body: '{"url":"https://billing.stripe.com/p/session/ps_1"}' })
    }

    // Deleting takes the account, its log and its token with it.
    if (path === '/v1/account' && method === 'DELETE') {
      if (service.remove) return answer(service.remove)

      service.accounts.forEach((each, email) => { if (each === held) service.accounts.delete(email) })

      return answer({ status: 204 })
    }

    if (path === '/v1/account') return answer({ body: view(held) })

    // An App Store purchase. The fake's JWS names the account it was bought
    // for, as a real one carries appAccountToken, and paying lifts whatever
    // refusal the log was answering.
    if (path === '/v1/apple/transactions') {
      if (service.apple) return answer(service.apple)

      const signed = JSON.parse(body).signed_transaction

      if (!`${signed}`.startsWith(`jws.${held.id}.`)) return answer({ status: 403, body: '{"error":"wrong_account"}' })

      service.transactions.push(signed)
      Object.assign(service, { subscribed: true, refuse: null, source: 'apple' })

      return answer({ body: view(held) })
    }

    if (service.refuse) return answer(service.refuse)
    if (method === 'PUT' && service.refuseWrites) return answer(service.refuseWrites)

    if (method === 'PUT') {
      if (!headers['if-match'] && !headers['if-none-match']) return answer({ status: 428, body: '{"error":"condition_required"}' })

      if ((headers['if-match'] && headers['if-match'] !== (held.log || {}).etag) || (headers['if-none-match'] === '*' && held.log)) {
        return answer({ status: 412, body: '{"error":"version_conflict"}' })
      }

      held.log = { body, etag: `"v${++service.writes}"` }

      return answer({ status: 204, etag: held.log.etag })
    }

    if (!held.log) return answer({ status: 404, body: '{"error":"no_log"}' })
    if (headers['if-none-match'] === held.log.etag) return answer({ status: 304 })

    return answer(held.log)
  }

  service.fetch = (url, init = {}) => {
    const request = { url: `${url}`, path: new URL(url).pathname, method: init.method || 'GET', body: init.body, headers: init.headers || {} }

    service.requests.push(request)

    return service.offline ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve(respond(request.path, init))
  }

  service.logs = () => service.requests.filter((request) => request.path === '/v1/log')
  service.body = () => ([...service.accounts.values()][0].log || {}).body || null

  return service
}

const PRICES = { month: '$2.99', year: '$24.99' }

// StoreKit as the iOS plugin answers it. `shelf` is what App Store Connect
// sells, `answer` is how the next purchase sheet ends, and `owned` is what
// the Apple Account holds: a JWS naming the account it was bought for.
const fakeStoreKit = ({ shelf = Object.entries(PRODUCTS).map(([id, every]) => ({ id, displayName: 'Follow Along Sync', displayPrice: PRICES[every] })) } = {}) => {
  const store = { shelf, answer: 'purchased', owned: [], calls: [] }
  const called = (...call) => store.calls.push(call)

  store.products = (ids) => {
    called('products', ids)

    return Promise.resolve(store.shelf.filter((product) => ids.includes(product.id)))
  }

  store.purchase = (productId, appAccountToken) => {
    called('purchase', productId, appAccountToken)

    if (store.answer !== 'purchased') return Promise.resolve({ status: store.answer })

    const signedTransaction = `jws.${appAccountToken}.${store.owned.length + 1}`

    store.owned.push(signedTransaction)

    return Promise.resolve({ status: 'purchased', signedTransaction })
  }

  store.entitlements = () => {
    called('entitlements')

    return Promise.resolve([...store.owned])
  }

  store.manage = () => {
    called('manage')

    return Promise.resolve()
  }

  return store
}

// Roll up is retired, so nothing in the app makes one of these any more. Logs
// written while it existed still arrive, and every object inside one exists
// only in that event, so the specs that cover them build one themselves.
const rollUp = async (app) => {
  const identity = app.vm.identity
  const queries = app.vm.queries

  const data = {
    identity,
    feeds: queries.feedsForIdentity(identity),
    entries: queries.entriesForIdentity(identity),
    signals: queries.signalsForIdentityForProjection(identity),
    addons: queries.addonsForIdentity(identity)
  }

  await app.vm.state.reset(identity.id)

  app.vm.state.track(identity.id, 'identities', identity.id, 'rollup', data)

  await app.wait()
}

// A stubbed response is written as the feed body it returns; anything richer
// (a 304, an error status) is given as the whole response object.
const responses = (values) => {
  const fn = vi.fn()

  values.forEach((val) => {
    fn.mockResolvedValueOnce(typeof val === 'string' ? { status: 200, body: val } : val)
  })

  return fn
}

const story = (description, func) => {
  return it(`Story: ${description}`, func)
}

const dig = (obj, key) => {
  const splat = key.split('.')
  const lastSplat = splat.pop()

  splat.forEach((k) => {
    obj = obj[k] || {}
  })

  return obj[lastSplat]
}

const objectsMatch = (a, b, key) => {
  const aVal = dig(a, key)
  const bVal = dig(b, key)

  if (typeof aVal === 'object') {
    return Object.keys(aVal).filter((k) => {
      return !objectsMatch(a, b, `${key}.${k}`)
    }).length === 0
  } else if (typeof bVal === 'object') {
    return Object.keys(bVal).filter((k) => {
      return !objectsMatch(a, b, `${key}.${k}`)
    }).length === 0
  } else {
    return aVal === bVal
  }
}

const event = (description, payload, optionsFunc) => {
  return it(`Event: ${description}`, async () => {
    const descriptionSplat = description.split('.')

    if (!payload.collection) {
      payload.collection = descriptionSplat[0]
    }

    if (!payload.action) {
      payload.action = descriptionSplat[1]
    }

    const options = optionsFunc()
    const stateEvents = options.app.vm.state.events
    const ev = stateEvents.find((e) => {
      for (const key in payload) {
        if (!objectsMatch(payload, e, key)) {
          return false
        }
      }

      return true
    })

    if (!ev) {
      throw new Error(`Event was not found for ${JSON.stringify(payload)}`)
    }

    expect(ev).toMatchObject(payload)

    const identity = options.app.vm.queries.allIdentities()[0]
    const localDB = options.app.vm.state._dbs[identity.id]._db
    const eventData = await localDB.getItem(ev.key)
    expect(eventData).toEqual(ev.toLocal())
  })
}

export {
  mountApp,
  describe,
  test,
  responses,
  rollUp,
  s3Bucket,
  s3Response,
  hostedService,
  fakeStoreKit,
  story,
  event,
  vi
}
