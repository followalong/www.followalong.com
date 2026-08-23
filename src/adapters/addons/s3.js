import Adapter from './adapter.js'

const STRIP_BEGINNING_AND_END_SLASHES = /^\/|\/$/g

class S3Adapter extends Adapter {
  constructor (adapterOptions, addonData) {
    super(adapterOptions, addonData)

    this.title = 'S3 Storage'
    this.description = 'Sync your event log to any S3-compatible bucket. The log is encrypted before it leaves the browser whenever the identity has a key, so the bucket only ever holds ciphertext.'
    this.preview = `Syncs to ${this.data.bucket || 'an S3 bucket'}`
    this.data.key = this.data.key || '/identities/followalong.log'
    this.data.endpoint = this.data.endpoint || 's3.us-east-1.amazonaws.com'
    this.fields = S3Adapter.FIELDS
  }

  save (data, encrypt) {
    return this._buildS3().then((s3) => {
      return new Promise((resolve, reject) => {
        s3.putObject({
          Body: encrypt(data),
          Bucket: this.data.bucket,
          Key: this._key()
        }, (err) => err ? reject(err) : resolve())
      })
    })
  }

  get (identity, decrypt) {
    return this._buildS3().then((s3) => {
      return new Promise((resolve, reject) => {
        s3.getObject({
          Bucket: this.data.bucket,
          Key: this._key()
        }, (err, data) => {
          if (!data) {
            return reject(new Error(err || 'No data returned'))
          }

          resolve(decrypt(`${data.Body}`))
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
    placeholder: '/identities/followalong.log'
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
    placeholder: 's3.us-east-1.amazonaws.com'
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
