import { describe, test, expect, vi, afterEach } from 'vitest'
import saveFile from './save-file.js'

const browser = ({ tauri, coarse = false, navigator = {} } = {}) => {
  const clicked = []

  vi.stubGlobal('__TAURI__', tauri)
  vi.stubGlobal('matchMedia', () => ({ matches: coarse }))
  vi.stubGlobal('navigator', navigator)
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:copy', revokeObjectURL: vi.fn() })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { clicked.push({ href: this.href, download: this.download }) })

  return clicked
}

// The iPhone app is the native build with the StoreKit plugin; the Mac app has none.
const iphone = () => ({ storekit: {} })
const mac = (invoke) => ({ core: { invoke } })
const sheet = (share) => ({ canShare: ({ files }) => files.length === 1, share })

describe('saveFile', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('downloads the file on a computer', async () => {
    const share = vi.fn()
    const clicked = browser({ navigator: sheet(share) })

    expect(await saveFile('a.followalong', 'text')).toBe(true)
    expect(clicked).toEqual([{ href: 'blob:copy', download: 'a.followalong' }])
    expect(share).not.toHaveBeenCalled()
  })

  test('opens the share sheet on a phone, with a plain document', async () => {
    const share = vi.fn(() => Promise.resolve())
    const clicked = browser({ coarse: true, navigator: sheet(share) })

    expect(await saveFile('a.followalong', 'text')).toBe(true)

    const file = share.mock.calls[0][0].files[0]

    expect([file.name, file.type, file.size]).toEqual(['a.followalong', 'text/plain', 4])
    expect(clicked).toEqual([])
  })

  test('downloads on a phone that cannot share a file', async () => {
    const clicked = browser({ coarse: true })

    expect(await saveFile('a.followalong', 'text')).toBe(true)
    expect(clicked).toHaveLength(1)
  })

  test('opens the share sheet in the iPhone app', async () => {
    const share = vi.fn(() => Promise.resolve())

    browser({ tauri: iphone(), navigator: sheet(share) })

    expect(await saveFile('a.followalong', 'text')).toBe(true)
    expect(share).toHaveBeenCalled()
  })

  test('answers false when the reader backs out of the share sheet', async () => {
    browser({ tauri: iphone(), navigator: sheet(() => Promise.reject(Object.assign(new Error('cancelled'), { name: 'AbortError' }))) })

    expect(await saveFile('a.followalong', 'text')).toBe(false)
  })

  test('says so when the share sheet fails', async () => {
    browser({ tauri: iphone(), navigator: sheet(() => Promise.reject(new Error('NotAllowedError'))) })

    await expect(saveFile('a.followalong', 'text')).rejects.toThrow('This device could not share the file. Use Copy this identity instead.')
  })

  test('says so in an iPhone app that cannot share a file, where a download does nothing', async () => {
    const clicked = browser({ tauri: iphone() })

    await expect(saveFile('a.followalong', 'text')).rejects.toThrow('This app cannot save a file on this device. Use Copy this identity instead.')
    expect(clicked).toEqual([])
  })

  test('opens the save panel in the Mac app, whose share sheet has no save', async () => {
    const share = vi.fn()
    const invoke = vi.fn(() => Promise.resolve(true))
    const clicked = browser({ tauri: mac(invoke), navigator: sheet(share) })

    expect(await saveFile('a.followalong', 'text')).toBe(true)
    expect(invoke.mock.calls).toEqual([['save_file', { name: 'a.followalong', text: 'text' }]])
    expect(share).not.toHaveBeenCalled()
    expect(clicked).toEqual([])
  })

  test('answers false when the reader cancels the save panel', async () => {
    browser({ tauri: mac(() => Promise.resolve(false)) })

    expect(await saveFile('a.followalong', 'text')).toBe(false)
  })

  test('says so when the Mac app cannot write the file', async () => {
    // The shell rejects with a bare string, not an Error.
    // eslint-disable-next-line prefer-promise-reject-errors
    browser({ tauri: mac(() => Promise.reject('Permission denied')) })

    await expect(saveFile('a.followalong', 'text')).rejects.toThrow('This app cannot save a file on this device. Use Copy this identity instead.')
  })
})
