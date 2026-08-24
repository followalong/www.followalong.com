import { describe, test, expect } from 'vitest'
import S3Adapter from './s3.js'

const CONFIGURED = {
  bucket: 'followalong-backup',
  region: 'us-east-1',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
}

const adapter = (data, awsS3) => new S3Adapter({ awsS3 }, { id: 'x', data: Object.assign({}, data) })

const bucket = (responses = {}) => {
  const calls = { getObject: [], putObject: [] }
  const s3 = {
    getObject (params, cb) {
      calls.getObject.push(params)
      const { err, data } = responses.get || { data: { Body: 'the log', ETag: '"current"' } }
      cb(err || null, data || null)
    },
    putObject (params, cb) {
      calls.putObject.push(params)
      const { err, data } = responses.put || { data: { ETag: '"written"' } }
      cb(err || null, data || null)
    }
  }

  return { calls, awsS3: () => Promise.resolve(s3) }
}

const plain = (data) => Promise.resolve(data)

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

  describe('#get', () => {
    test('asks unconditionally when it has not seen a copy', async () => {
      const { calls, awsS3 } = bucket()

      await adapter(CONFIGURED, awsS3).get(null, plain, {})

      expect(calls.getObject[0].IfNoneMatch).toBeUndefined()
    })

    test('asks for the copy it has not seen, and reports the one it got', async () => {
      const { calls, awsS3 } = bucket()

      const response = await adapter(CONFIGURED, awsS3).get(null, plain, { etag: '"held"' })

      expect(calls.getObject[0].IfNoneMatch).toEqual('"held"')
      expect(response.status).toEqual(200)
      expect(response.body).toEqual('the log')
      expect(response.etag).toEqual('"current"')
    })

    // This SDK hands a conditional match to the callback as an error, and a
    // caller that read it as one would abort the sync it was about to do.
    test('reads a conditional match as no change, not as a failure', async () => {
      const { awsS3 } = bucket({ get: { err: Object.assign(new Error('NotModified'), { statusCode: 304, code: 'NotModified' }) } })

      const response = await adapter(CONFIGURED, awsS3).get(null, plain, { etag: '"held"' })

      expect(response.status).toEqual(304)
      expect(response.body).toEqual('')
      expect(response.etag).toEqual('"held"')
    })

    // A bucket whose CORS policy names the headers it allows rather than
    // allowing all of them refuses the preflight for If-None-Match, and a
    // request we did not have to make must not be what stops the sync.
    test('reads unconditionally when the bucket refuses the condition', async () => {
      const calls = []
      const awsS3 = () => Promise.resolve({
        getObject (params, cb) {
          calls.push(params)

          return params.IfNoneMatch ? cb(new Error('Network Failure'), null) : cb(null, { Body: 'the log', ETag: '"current"' })
        }
      })

      const response = await adapter(CONFIGURED, awsS3).get(null, plain, { etag: '"held"' })

      expect(calls.length).toEqual(2)
      expect(calls[1].IfNoneMatch).toBeUndefined()
      expect(response.body).toEqual('the log')
      expect(response.etag).toEqual('"current"')
    })

    test('still fails on anything else', async () => {
      const { awsS3 } = bucket({ get: { err: new Error('AccessDenied') } })

      await expect(adapter(CONFIGURED, awsS3).get(null, plain, {})).rejects.toThrow(/AccessDenied/)
    })
  })

  describe('#save', () => {
    test('reports the copy it just wrote', async () => {
      const { awsS3 } = bucket()

      const response = await adapter(CONFIGURED, awsS3).save('the log', plain)

      expect(response.etag).toEqual('"written"')
    })
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
