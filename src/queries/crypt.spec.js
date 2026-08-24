import { describe, test, expect } from 'vitest'
import { encrypt, decrypt } from './crypt.js'

const PASSWORD = 'a password'

describe('crypt', () => {
  test('round-trips a payload', async () => {
    const cipher = await encrypt(PASSWORD)('hello')

    expect(await decrypt(PASSWORD)(cipher)).toEqual('hello')
  })

  // A rolled up identity is one event carrying every feed and entry, so the
  // log a bucket holds is megabytes rather than kilobytes.
  test('round-trips a log the size of a rolled up identity', async () => {
    const log = 'x'.repeat(1024 * 1024)
    const cipher = await encrypt(PASSWORD)(log)

    expect(await decrypt(PASSWORD)(cipher)).toEqual(log)
  })
})
