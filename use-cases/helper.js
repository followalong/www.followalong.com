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

    await store.reset()

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
        automaticFetch: options.automaticFetch || false
      }
    })

    app.click = async (el) => {
      let $el = null

      try {
        $el = await app.find(el)
      } catch (e) { }

      if (!$el) {
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

      if (!$el) {
        throw new Error(`Could not find element: ${el} in ${app.text()}`)
      }

      await $el.trigger('submit')
      await app.wait()
    }

    app.wait = async () => {
      await flushPromisesAndTimers()
    }

    app.getLocalDefaultIdentity = async () => {
      const ids = await app.vm.commands.keychainAdapter.getKeys()

      if (!ids.length) {
        return null
      }

      const identity = await app.vm.commands.getLocalIdentity(ids[0])

      return identity
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

const responses = (values) => {
  const fn = vi.fn()

  values.forEach((val) => fn.mockResolvedValueOnce(val))

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

const storage = (namespace, key, payload, optionsFunc) => {
  return it(`Storage: ${namespace}.${key}`, async () => {
    const db = optionsFunc()
    const storedValue = await db.getItem(key)

    expect(storedValue).toMatchObject(payload)
  })
}

export {
  mountApp,
  describe,
  test,
  responses,
  story,
  event,
  storage,
  vi
}
