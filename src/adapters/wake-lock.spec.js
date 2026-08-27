import { describe, test, expect, vi } from 'vitest'
import WakeLock from './wake-lock.js'

const sentinel = () => {
  const listeners = {}

  return {
    release: vi.fn().mockResolvedValue(),
    addEventListener: (name, fn) => { listeners[name] = fn },
    fire: (name) => listeners[name] && listeners[name]()
  }
}

const world = ({ request, visibility = 'visible' } = {}) => {
  const listeners = {}
  const held = sentinel()

  return {
    held,
    document: {
      get visibilityState () { return this._v || visibility },
      addEventListener: (name, fn) => { listeners[name] = fn },
      show: function () { this._v = 'visible'; return listeners.visibilitychange() },
      hide: function () { this._v = 'hidden'; return listeners.visibilitychange() }
    },
    navigator: {
      wakeLock: { request: request || vi.fn().mockResolvedValue(held) }
    }
  }
}

describe('WakeLock', () => {
  test('asks the screen to stay on', async () => {
    const w = world()
    await new WakeLock(w).hold()

    expect(w.navigator.wakeLock.request).toHaveBeenCalledWith('screen')
  })

  test('hands it back', async () => {
    const w = world()
    const lock = new WakeLock(w)

    await lock.hold()
    await lock.release()

    expect(w.held.release).toHaveBeenCalled()
  })

  test('asks once however often it is told to hold', async () => {
    const w = world()
    const lock = new WakeLock(w)

    await lock.hold()
    await lock.hold()

    expect(w.navigator.wakeLock.request).toHaveBeenCalledTimes(1)
  })

  // The browser takes the lock back whenever the page is hidden and does not
  // hand it back on its own, so this is the whole reason the class exists:
  // without it, playing something and switching apps loses the lock silently.
  test('asks again when the page comes back, if it is still wanted', async () => {
    const w = world()
    const lock = new WakeLock(w)

    await lock.hold()
    w.held.fire('release')
    await w.document.hide()
    await w.document.show()

    expect(w.navigator.wakeLock.request).toHaveBeenCalledTimes(2)
  })

  test('stays quiet when the page comes back and nothing is playing', async () => {
    const w = world()
    const lock = new WakeLock(w)

    await lock.hold()
    await lock.release()
    await w.document.show()

    expect(w.navigator.wakeLock.request).toHaveBeenCalledTimes(1)
  })

  // Absent on older browsers; refuses in low power mode or on a hidden page.
  // Playback is not worth interrupting over either.
  test('shrugs when the browser has never heard of it', async () => {
    const w = world()
    delete w.navigator.wakeLock

    await expect(new WakeLock(w).hold()).resolves.toBeUndefined()
  })

  test('shrugs when the browser refuses', async () => {
    const w = world({ request: vi.fn().mockRejectedValue(new Error('NotAllowedError')) })

    await expect(new WakeLock(w).hold()).resolves.toBeUndefined()
  })

  test('does not hold on to a lock that arrived after it was told to stop', async () => {
    const w = world()
    let settle
    w.navigator.wakeLock.request = vi.fn(() => new Promise((resolve) => { settle = resolve }))

    const lock = new WakeLock(w)
    const asked = lock.hold()

    await lock.release()
    settle(w.held)
    await asked

    expect(w.held.release).toHaveBeenCalled()
  })
})
