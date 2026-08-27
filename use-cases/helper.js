/* eslint no-async-promise-executor: 0 */

import { mount, flushPromises } from '@vue/test-utils'
import { vi, describe, test } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { routes } from '../src/app/router/index.js'
import runners from '../src/state/runners.js'
import MultiEventStore from '../src/state/multi-event-store.js'
import App from '../src/app/component.vue'

const mountApp = (options) => {
  return new Promise(async (resolve) => {
    options = options || {}

    const store = new MultiEventStore(Math.random(), 'v2.1', runners)

    await store.clear()

    if (options.state) {
      for (const id in options.state) {
        const identity = options.state[id]

        store.createDB(id, identity.config)
        await store.importRaw(id, identity.data)
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
        scrollTo: vi.fn(),
        prompt: options.prompt || vi.fn(),
        keychainName: `keychain-${Math.random()}`,
        copyToClipboard: options.copyToClipboard || vi.fn(),
        handoffHash: options.handoffHash || '',
        wakeLock: options.wakeLock || { hold: vi.fn(), release: vi.fn() },
        awsClient: options.awsClient || (() => ({ fetch: () => Promise.resolve(s3Response({ status: 404, body: '<Error><Code>NoSuchKey</Code></Error>' })) }))
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
// exactly as a real one would. `answer` takes it over for a spec that wants a
// refusal or a hang.
const s3Bucket = ({ answer, objects = {} } = {}) => {
  const bucket = {
    requests: [],
    objects: Object.assign({}, objects),
    etags: {},
    version: 0,
    answer
  }

  bucket.of = (request) => `${request.url}`

  bucket.store = (request) => {
    const key = bucket.of(request)

    bucket.objects[key] = `${request.body}`
    bucket.etags[key] = `"v${++bucket.version}"`

    return s3Response({ headers: { etag: bucket.etags[key] } })
  }

  bucket.read = (request) => {
    const key = bucket.of(request)

    if (typeof bucket.objects[key] === 'undefined') {
      return s3Response({ status: 404, body: '<Error><Code>NoSuchKey</Code></Error>' })
    }

    if (request.headers['if-none-match'] && request.headers['if-none-match'] === bucket.etags[key]) {
      return s3Response({ status: 304 })
    }

    return s3Response({ status: 200, body: bucket.objects[key], headers: { etag: bucket.etags[key] || '"v0"' } })
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
  s3Bucket,
  s3Response,
  story,
  event,
  vi
}
