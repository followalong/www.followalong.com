import { describe, test, expect } from 'vitest'
import { encodeHandoff, decodeHandoff } from './handoff.js'

describe('handoff', () => {
  const payload = { t: 'S3Adapter', d: { bucket: 'b' }, k: 'hunter2' }

  test('survives a round trip', () => {
    expect(decodeHandoff(`#${encodeHandoff(payload)}`)).toEqual(payload)
  })

  test('reads the code out of a whole URL', () => {
    expect(decodeHandoff(`https://www.followalong.com/#${encodeHandoff(payload)}`).d.bucket).toEqual('b')
  })

  test('carries a password that is not ASCII', () => {
    const encoded = encodeHandoff({ t: 'S3Adapter', d: {}, k: 'påsswörd☂' })

    expect(decodeHandoff(encoded).k).toEqual('påsswörd☂')
  })

  test('is nothing for a fragment that is not a setup code', () => {
    expect(decodeHandoff('#section-two')).toBeNull()
    expect(decodeHandoff('')).toBeNull()
  })

  test('is nothing for a code that does not decode', () => {
    expect(decodeHandoff('#setup=not-base64-json')).toBeNull()
  })
})
