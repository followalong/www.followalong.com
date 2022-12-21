import AWS from 'aws-sdk'

const STRIP_BEGINNING_AND_END_SLASHES = /^\/|\/$/g

class S3 {
  constructor (data) {
    this.data = data
    this.name = this.data.name || 'S3'
    this.preview = `${this.name} (${this.data.bucket}${this.data.filename})`
    this.description = 'Store data directly to an S3-compatible server.'
    this.data.region = this.data.region || S3.FIELDS.region.default
    this.data.endpoint = this.data.endpoint || S3.FIELDS.endpoint.default
  }

  put (data, encrypt) {
    encrypt = encrypt || S3.ENCRYPT

    return new Promise((resolve, reject) => {
      this._buildS3().putObject({
        Body: encrypt(typeof data === 'string' ? data : JSON.stringify(data)),
        Bucket: this.data.bucket,
        Key: this.data.filename.replace(STRIP_BEGINNING_AND_END_SLASHES, '')
      }, function (err) {
        if (err) {
          return reject(err)
        }

        resolve()
      })
    })
  }

  fetch (decrypt) {
    decrypt = decrypt || S3.DECRYPT

    return new Promise((resolve, reject) => {
      this._buildS3().getObject({
        Bucket: this.data.bucket,
        Key: this.data.filename.replace(STRIP_BEGINNING_AND_END_SLASHES, '')
      }, function (err, data) {
        if (err) {
          return reject(err)
        }

        if (!data.Body) {
          return reject(new Error('No content'))
        }

        let body = decrypt(data.Body.toString())

        try {
          body = JSON.parse(body)
        } catch (e) {}

        resolve(body)
      })
    })
  }

  _buildS3 () {
    return new AWS.S3({
      endpoint: new AWS.Endpoint(this.data.endpoint),
      accessKeyId: this.data.accessKeyId,
      secretAccessKey: this.data.secretAccessKey,
      region: this.data.region,
      apiVersion: 'latest',
      maxRetries: 1
    })
  }
}

S3.NAME = 'S3'

S3.ENCRYPT = (str) => str
S3.DECRYPT = (str) => str

S3.FIELDS = {
  endpoint: {
    type: 'text',
    label: 'Endpoint',
    required: true,
    placeholder: 's3.us-east-1.amazonaws.com',
    suggestions: [
      's3.us-east-2.amazonaws.com',
      's3.af-south-1.amazonaws.com',
      's3.ap-east-1.amazonaws.com',
      's3.ap-southeast-3.amazonaws.com',
      's3.ap-south-1.amazonaws.com',
      's3.ap-northeast-3.amazonaws.com',
      's3.ap-northeast-2.amazonaws.com',
      's3.ca-central-1.amazonaws.com',
      's3.cn-northwest-1.amazonaws.com',
      's3.eu-central-1.amazonaws.com',
      's3.eu-west-2.amazonaws.com',
      's3.eu-south-1.amazonaws.com',
      's3.eu-west-3.amazonaws.com',
      's3.eu-north-1.amazonaws.com',
      's3.me-south-1.amazonaws.com',
      's3.me-central-1.amazonaws.com',
      's3.us-gov-east.amazonaws.com'
    ]
  },
  region: {
    type: 'text',
    label: 'Region',
    required: true,
    placeholder: 'us-east-1',
    suggestions: [
      'us-east-2',
      'af-south-1',
      'ap-east-1',
      'ap-southeast-3',
      'ap-south-1',
      'ap-northeast-3',
      'ap-northeast-2',
      'ca-central-1',
      'cn-northwest-1',
      'eu-central-1',
      'eu-west-2',
      'eu-south-1',
      'eu-west-3',
      'eu-north-1',
      'me-south-1',
      'me-central-1',
      'us-gov-east'
    ]
  },
  bucket: {
    type: 'text',
    label: 'Bucket',
    required: true,
    placeholder: 'my-bucket'
  },
  filename: {
    type: 'text',
    label: 'Key',
    required: true,
    placeholder: '/'
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

export default S3
