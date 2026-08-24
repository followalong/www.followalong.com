import Adapter from './adapter.js'

const STRIP_BEGINNING_AND_END_SLASHES = /^\/|\/$/g
const NOT_MODIFIED = 304

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
    return Promise.all([this._buildS3(), encrypt(data)]).then(([s3, body]) => {
      return new Promise((resolve, reject) => {
        s3.putObject({
          Body: body,
          Bucket: this.data.bucket,
          Key: this._key()
        }, (err, written) => err ? reject(err) : resolve({ etag: written && written.ETag }))
      })
    })
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
          return response
        }

        return Promise.resolve(decrypt(`${response.body}`))
          .then((body) => Object.assign({}, response, { body }))
      })
  }

  _read (etag) {
    return this._buildS3().then((s3) => {
      const params = { Bucket: this.data.bucket, Key: this._key() }

      if (etag) {
        params.IfNoneMatch = etag
      }

      return new Promise((resolve, reject) => {
        s3.getObject(params, (err, data) => {
          // A match comes back through the error argument in this SDK, and it
          // is the opposite of a failure: what we hold is what is there.
          if (err && (err.statusCode === NOT_MODIFIED || err.code === 'NotModified')) {
            return resolve({ status: NOT_MODIFIED, body: '', etag })
          }

          if (!data) {
            return reject(new Error(err || 'No data returned'))
          }

          resolve({ status: 200, body: data.Body, etag: data.ETag })
        })
      })
    })
  }

  validate (data) {
    return !!(data.bucket && data.accessKeyId && data.secretAccessKey)
  }

  _key () {
    return this.data.key.replace(STRIP_BEGINNING_AND_END_SLASHES, '')
  }

  _buildS3 () {
    return Promise.resolve(this.awsS3({
      endpoint: this.data.endpoint,
      accessKeyId: this.data.accessKeyId,
      secretAccessKey: this.data.secretAccessKey,
      region: this.data.region,
      apiVersion: 'latest',
      maxRetries: 1
    }))
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

export default S3Adapter
