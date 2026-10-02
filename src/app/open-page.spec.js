import { describe, test, expect, vi, afterEach } from 'vitest'
import openPage from './open-page.js'

const URL = 'https://checkout.stripe.com/c/pay/cs_1'

describe('opening a page outside the app', () => {
  afterEach(() => vi.unstubAllGlobals())

  test('opens a new window in a browser, with the opener cut', () => {
    const opened = { opener: window }
    const open = vi.fn(() => opened)

    vi.stubGlobal('open', open)

    expect(openPage(URL)).toEqual(true)
    expect(open).toHaveBeenCalledWith(URL, '_blank')
    expect(opened.opener).toEqual(null)
  })

  test('says so when the browser refused', () => {
    vi.stubGlobal('open', vi.fn(() => null))

    expect(openPage(URL)).toEqual(false)
  })

  // window.open answers null in the native webview, and the shell hands
  // http(s) links to the system browser instead.
  test('hands the page to the system browser in a native build', () => {
    const invoke = vi.fn(() => Promise.resolve())
    const open = vi.fn(() => null)

    vi.stubGlobal('__TAURI__', { core: { invoke } })
    vi.stubGlobal('open', open)

    expect(openPage(URL)).toEqual(true)
    expect(invoke).toHaveBeenCalledWith('open_url', { url: URL })
    expect(open).not.toHaveBeenCalled()
  })
})
