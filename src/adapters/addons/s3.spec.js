import { describe, test, expect, vi, afterEach } from 'vitest'
import S3Adapter, { TIMEOUT_MS } from './s3.js'

const CONFIGURED = {
  bucket: 'followalong-backup',
  region: 'us-east-1',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
}

const adapter = (data, awsClient) => new S3Adapter({ awsClient }, { id: 'x', data: Object.assign({}, data) })

const response = ({ status = 200, body = '', headers = {} }) => ({
  ok: status >= 200 && status < 300,
  status,
  text: () => Promise.resolve(body),
  headers: { get: (name) => headers[name.toLowerCase()] ?? null }
})

// Signed requests over fetch, recorded so a spec can see the URL the
// addressing rule built and the headers the signer was asked to sign.
const bucket = (answer) => {
  const requests = []
  const awsClient = (config) => ({
    fetch: (url, init = {}) => {
      const request = { url: `${url}`, method: init.method || 'GET', body: init.body, headers: init.headers || {}, signal: init.signal, config }

      requests.push(request)

      return Promise.resolve((answer || (() => response({ body: 'the log', headers: { etag: '"current"' } })))(request))
    }
  })

  return { requests, awsClient }
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
    test('signs with the credentials and region the addon was configured with', async () => {
      const { requests, awsClient } = bucket()

      await adapter(CONFIGURED, awsClient).get(null, plain, {})

      expect(requests[0].config).toMatchObject({
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-east-1',
        service: 's3'
      })
    })

    test('asks the address the bucket and key make', async () => {
      const { requests, awsClient } = bucket()

      await adapter(CONFIGURED, awsClient).get(null, plain, {})

      expect(requests[0].url).toEqual('https://followalong-backup.s3.us-east-1.amazonaws.com/identities/followalong.log')
      expect(requests[0].method).toEqual('GET')
    })

    test('asks unconditionally when it has not seen a copy', async () => {
      const { requests, awsClient } = bucket()

      await adapter(CONFIGURED, awsClient).get(null, plain, {})

      expect(requests[0].headers['if-none-match']).toBeUndefined()
    })

    test('asks for the copy it has not seen, and reports the one it got', async () => {
      const { requests, awsClient } = bucket()

      const answer = await adapter(CONFIGURED, awsClient).get(null, plain, { etag: '"held"' })

      expect(requests[0].headers['if-none-match']).toEqual('"held"')
      expect(answer.status).toEqual(200)
      expect(answer.body).toEqual('the log')
      expect(answer.etag).toEqual('"current"')
    })

    test('reads a conditional match as no change, not as a failure', async () => {
      const { awsClient } = bucket(() => response({ status: 304 }))

      const answer = await adapter(CONFIGURED, awsClient).get(null, plain, { etag: '"held"' })

      expect(answer.status).toEqual(304)
      expect(answer.body).toEqual('')
      expect(answer.etag).toEqual('"held"')
    })

    // A bucket whose CORS policy names the headers it allows rather than
    // allowing all of them refuses the preflight for If-None-Match, and a
    // request we did not have to make must not be what stops the sync.
    test('reads unconditionally when the bucket refuses the condition', async () => {
      const { requests, awsClient } = bucket((request) => {
        if (request.headers['if-none-match']) return Promise.reject(new TypeError('Failed to fetch'))

        return response({ body: 'the log', headers: { etag: '"current"' } })
      })

      const answer = await adapter(CONFIGURED, awsClient).get(null, plain, { etag: '"held"' })

      expect(requests.length).toEqual(2)
      expect(requests[1].headers['if-none-match']).toBeUndefined()
      expect(answer.body).toEqual('the log')
    })

    test('still fails on anything else', async () => {
      const { awsClient } = bucket(() => response({ status: 403, body: '<Error><Code>AccessDenied</Code></Error>' }))

      await expect(adapter(CONFIGURED, awsClient).get(null, plain, {})).rejects.toThrow(/AccessDenied/)
    })

    // Commands tells an empty bucket apart from a read that failed by the
    // message, and writing over a copy it could not read is what that guards.
    test('names a missing object the way an empty bucket is recognised', async () => {
      const { awsClient } = bucket(() => response({ status: 404, body: '<Error><Code>NoSuchKey</Code></Error>' }))

      await expect(adapter(CONFIGURED, awsClient).get(null, plain, {})).rejects.toThrow(/nosuchkey|404/i)
    })
  })

  // A hung bucket read is swallowed with a console.warn on boot and leaves
  // the sync reading "Saving..." for the rest of the session otherwise.
  describe('when the bucket never answers', () => {
    afterEach(() => vi.useRealTimers())

    test('gives up, and says the bucket is what did not answer', async () => {
      vi.useFakeTimers()

      // What fetch does with a signal: rejects when it is aborted, and
      // straight away if it already was.
      const { awsClient } = bucket((request) => new Promise((resolve, reject) => {
        const stop = () => reject(new Error('The operation was aborted.'))

        request.signal.aborted ? stop() : request.signal.addEventListener('abort', stop)
      }))

      const caught = adapter(CONFIGURED, awsClient).get(null, plain, {}).catch((e) => e)

      vi.advanceTimersByTime(TIMEOUT_MS)

      expect((await caught).message).toMatch(/did not answer in time/)
    })
  })

  describe('#save', () => {
    test('puts the body at the same address', async () => {
      const { requests, awsClient } = bucket(() => response({ headers: { etag: '"written"' } }))

      await adapter(CONFIGURED, awsClient).save('the log', plain)

      expect(requests[0].method).toEqual('PUT')
      expect(requests[0].url).toEqual('https://followalong-backup.s3.us-east-1.amazonaws.com/identities/followalong.log')
      expect(requests[0].body).toEqual('the log')
    })

    test('reports the copy it just wrote', async () => {
      const { awsClient } = bucket(() => response({ headers: { etag: '"written"' } }))

      const written = await adapter(CONFIGURED, awsClient).save('the log', plain)

      expect(written.etag).toEqual('"written"')
    })

    test('fails when the bucket refuses the write', async () => {
      const { awsClient } = bucket(() => response({ status: 403, body: '<Error><Code>AccessDenied</Code></Error>' }))

      await expect(adapter(CONFIGURED, awsClient).save('the log', plain)).rejects.toThrow(/AccessDenied/)
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
