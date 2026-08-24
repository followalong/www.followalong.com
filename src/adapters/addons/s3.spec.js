import { describe, test, expect } from 'vitest'
import S3Adapter from './s3.js'

const CONFIGURED = {
  bucket: 'followalong-backup',
  region: 'us-east-1',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
}

const adapter = (data) => new S3Adapter({}, { id: 'x', data: Object.assign({}, data) })

describe('S3Adapter', () => {
  test('fills in the key and endpoint it was not given', () => {
    const s3 = adapter(CONFIGURED)

    expect(s3.data.key).toEqual('/identities/followalong.log')
    expect(s3.data.endpoint).toEqual('s3.us-east-1.amazonaws.com')
  })

  test('keeps a key and endpoint it was given', () => {
    const s3 = adapter(Object.assign({}, CONFIGURED, { key: '/mine.log', endpoint: 'nyc3.digitaloceanspaces.com' }))

    expect(s3.data.key).toEqual('/mine.log')
    expect(s3.data.endpoint).toEqual('nyc3.digitaloceanspaces.com')
  })

  test('leaves the addon it was built from alone', () => {
    const addon = { id: 'x', data: Object.assign({}, CONFIGURED) }

    new S3Adapter({}, addon) // eslint-disable-line no-new

    expect(addon.data.key).toBeUndefined()
  })

  describe('#portableData', () => {
    test('leaves out what the other end fills in for itself', () => {
      const data = adapter(CONFIGURED).portableData()

      expect(data.key).toBeUndefined()
      expect(data.endpoint).toBeUndefined()
      expect(data.bucket).toEqual('followalong-backup')
      expect(data.secretAccessKey).toEqual('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY')
    })

    test('carries a key and endpoint that are not the defaults', () => {
      const data = adapter(Object.assign({}, CONFIGURED, { key: '/mine.log', endpoint: 'nyc3.digitaloceanspaces.com' })).portableData()

      expect(data.key).toEqual('/mine.log')
      expect(data.endpoint).toEqual('nyc3.digitaloceanspaces.com')
    })

    test('rebuilds an identical adapter config', () => {
      const configs = [
        CONFIGURED,
        Object.assign({}, CONFIGURED, { key: '/mine.log' }),
        Object.assign({}, CONFIGURED, { endpoint: 'nyc3.digitaloceanspaces.com' })
      ]

      configs.forEach((config) => {
        const source = adapter(config)
        const arrived = adapter(source.portableData())

        expect(arrived.data).toEqual(source.data)
      })
    })
  })
})
