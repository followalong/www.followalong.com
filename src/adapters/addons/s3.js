import Adapter from './adapter.js'
import s3Url from './s3-url.js'

const NOT_MODIFIED = 304
const OK = 200

// The object is the whole log rather than a page of it, and an upload leaves
// over the slow half of a home connection, so the bucket gets a far larger
// budget than a feed poll does. It is here at all because a request with no
// limit leaves the sync reading "Saving..." for the rest of the session.
const TIMEOUT_MS = 60000

// S3 says what went wrong in the body, and the difference between an empty
// bucket and a bucket we were refused decides whether we are allowed to
// write over what is there.
const CODE = /<Code>([^<]+)<\/Code>/

class S3Adapter extends Adapter {
  constructor (adapterOptions, addonData) {
    super(adapterOptions, addonData)

    this.title = 'S3 Storage'
    this.description = 'Sync your event log to any S3-compatible bucket. The log is encrypted before it leaves the browser whenever the identity has a key, so the bucket only ever holds ciphertext.'
    this.preview = `Syncs to ${this.data.bucket || 'an S3 bucket'}`
    this.fields = S3Adapter.FIELDS
  }

  // Answers with the version it just wrote, so the next read can ask for
  // anything but that and be told there is nothing to fetch.
  save (data, encrypt) {
    return Promise.resolve(encrypt(data))
      .then((body) => this._send({ method: 'PUT', body }))
      .then((response) => ({ etag: response.headers.get('etag') || undefined }))
  }

  // Conditional on the version the caller already holds: the log is the whole
  // corpus in one object, so a device that is up to date should be told so
  // rather than sent a megabyte it will fold into itself and discard.
  get (identity, decrypt, { etag } = {}) {
    return this._read(etag)
      // The condition is an optimisation and never a requirement, so a bucket
      // that will not take it is asked again without it: a policy naming the
      // headers it allows refuses the preflight for If-None-Match, and a
      // request we did not have to make must not be what stops the sync.
      .catch((e) => etag ? this._read() : Promise.reject(e))
      .then((response) => {
        if (response.status === NOT_MODIFIED) {
          return { status: NOT_MODIFIED, body: '', etag }
        }

        return response.text()
          .then((body) => Promise.resolve(decrypt(body)))
          .then((body) => ({ status: OK, body, etag: response.headers.get('etag') || undefined }))
      })
  }

  _read (etag) {
    return this._send({ method: 'GET', headers: etag ? { 'if-none-match': etag } : {} })
  }

  _send ({ method, body, headers = {} }) {
    const url = this.url()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    return Promise.resolve(this.awsClient({
      accessKeyId: this.data.accessKeyId,
      secretAccessKey: this.data.secretAccessKey,
      region: this.data.region,
      service: 's3'
    }))
      .then((client) => client.fetch(url, { method, body, headers, signal: controller.signal }))
      // The budget buys an answer, not the reading of one. Left armed while
      // the body is read, it would relabel a refusal we are halfway through
      // as a bucket that never answered — and on an upload the answer only
      // comes once the whole log has gone up, which is the part worth timing.
      .then(
        (response) => {
          clearTimeout(timer)

          return response
        },
        (e) => {
          clearTimeout(timer)

          throw controller.signal.aborted ? new Error('The bucket did not answer in time') : e
        }
      )
      .then((response) => {
        if (response.ok || response.status === NOT_MODIFIED) {
          return response
        }

        // Status first, so the message carries it whether or not the body
        // named a code we recognise.
        return response.text().then((text) => {
          const found = `${text || ''}`.match(CODE)

          throw new Error(`${response.status} ${found ? found[1] : 'request refused'}`)
        })
      })
  }

  // The address the bucket, endpoint and key make. s3Url decides whether the
  // bucket belongs in the host or the path, which is not ours to choose: it
  // is whatever the storage is already answering to.
  url () {
    return s3Url({ bucket: this.data.bucket, endpoint: this.data.endpoint, key: this.data.key })
  }

  validate (data) {
    return !!(data.bucket && data.accessKeyId && data.secretAccessKey)
  }
}

// Filled in by the constructor when they are absent, which is also what lets
// a setup code leave them out.
S3Adapter.DEFAULTS = {
  key: '/identities/followalong.log',
  endpoint: 's3.us-east-1.amazonaws.com'
}

S3Adapter.FIELDS = {
  bucket: {
    type: 'text',
    label: 'Bucket',
    required: true
  },
  key: {
    type: 'text',
    label: 'Key',
    required: true,
    placeholder: S3Adapter.DEFAULTS.key
  },
  region: {
    type: 'text',
    label: 'Region',
    required: true,
    placeholder: 'us-east-1'
  },
  endpoint: {
    type: 'text',
    label: 'Endpoint',
    required: true,
    placeholder: S3Adapter.DEFAULTS.endpoint
  },
  accessKeyId: {
    type: 'text',
    label: 'Access Key ID',
    required: true
  },
  secretAccessKey: {
    type: 'password',
    label: 'Secret Access Key',
    required: true
  }
}

export { TIMEOUT_MS }
export default S3Adapter
