import { describe, test, expect } from 'vitest'
import { encrypt, decrypt } from './crypt.js'

const PASSWORD = 'a password'

describe('crypt', () => {
  test('round-trips a payload', async () => {
    const cipher = await encrypt(PASSWORD)('hello')

    expect(await decrypt(PASSWORD)(cipher)).toEqual('hello')
  })

  // Base64 goes through bytes, so anything that is not a plain ASCII byte is
  // where a hand-rolled decoder gets it wrong.
  test('round-trips text that is not ASCII', async () => {
    const log = 'héllo — 日本語 — \u{1F600} — ünïcødé'
    const cipher = await encrypt(PASSWORD)(log)

    expect(await decrypt(PASSWORD)(cipher)).toEqual(log)
  })

  test('round-trips every byte a payload can contain', async () => {
    const log = new Array(256).fill(0).map((_, i) => String.fromCharCode(i)).join('')
    const cipher = await encrypt(PASSWORD)(log)

    expect(await decrypt(PASSWORD)(cipher)).toEqual(log)
  })

  // A rolled up identity is one event carrying every feed and entry, so the
  // log a bucket holds is megabytes rather than kilobytes.
  test('round-trips a log the size of a rolled up identity', async () => {
    const log = 'x'.repeat(1024 * 1024)
    const cipher = await encrypt(PASSWORD)(log)

    expect(await decrypt(PASSWORD)(cipher)).toEqual(log)
  })
})
