import { describe, test, expect } from 'vitest'
import s3Url from './s3-url.js'

const AWS = 's3.us-east-1.amazonaws.com'
const KEY = 'identities/followalong.log'

// These are the URLs aws-sdk v2 built, and people have arbitrary endpoints
// configured against them. The rule is reproduced rather than improved on:
// anything that works today has to keep working, and the only evidence we
// have of what works is what the SDK was already sending.
describe('s3Url', () => {
  test('puts an ordinary bucket in the host, the way AWS asks for', () => {
    expect(s3Url({ bucket: 'followalong-backup', endpoint: AWS, key: KEY }))
      .toEqual('https://followalong-backup.s3.us-east-1.amazonaws.com/identities/followalong.log')
  })

  // A wildcard certificate covers one label, so a dotted bucket in the host
  // fails TLS. Those go in the path instead.
  test('puts a dotted bucket in the path, because the certificate would not cover it', () => {
    expect(s3Url({ bucket: 'my.backups', endpoint: AWS, key: KEY }))
      .toEqual('https://s3.us-east-1.amazonaws.com/my.backups/identities/followalong.log')
  })

  test('puts a bucket that is not a valid hostname in the path', () => {
    expect(s3Url({ bucket: 'My_Backups', endpoint: AWS, key: KEY }))
      .toEqual('https://s3.us-east-1.amazonaws.com/My_Backups/identities/followalong.log')

    expect(s3Url({ bucket: '10.0.0.1', endpoint: AWS, key: KEY }))
      .toEqual('https://s3.us-east-1.amazonaws.com/10.0.0.1/identities/followalong.log')

    expect(s3Url({ bucket: 'ab', endpoint: AWS, key: KEY }))
      .toEqual('https://s3.us-east-1.amazonaws.com/ab/identities/followalong.log')
  })

  test('handles an R2 account endpoint', () => {
    expect(s3Url({ bucket: 'followalong', endpoint: 'abc123def456.r2.cloudflarestorage.com', key: KEY }))
      .toEqual('https://followalong.abc123def456.r2.cloudflarestorage.com/identities/followalong.log')
  })

  test('keeps the port a self-hosted endpoint carries', () => {
    expect(s3Url({ bucket: 'backups', endpoint: 'minio.example.com:9000', key: KEY }))
      .toEqual('https://backups.minio.example.com:9000/identities/followalong.log')
  })

  // The dot rule is about TLS, so it does not apply without it.
  test('keeps the scheme an endpoint names, and only checks the dot under TLS', () => {
    expect(s3Url({ bucket: 'my.backups', endpoint: 'http://minio.example.com:9000', key: KEY }))
      .toEqual('http://my.backups.minio.example.com:9000/identities/followalong.log')

    expect(s3Url({ bucket: 'backups', endpoint: 'https://minio.example.com', key: KEY }))
      .toEqual('https://backups.minio.example.com/identities/followalong.log')
  })

  test('does not double up on slashes', () => {
    expect(s3Url({ bucket: 'backups', endpoint: 'https://minio.example.com/', key: '/identities/followalong.log' }))
      .toEqual('https://backups.minio.example.com/identities/followalong.log')
  })

  // The signature is computed over the encoded path, so a key the browser
  // would encode on its way out has to be encoded before it is signed.
  test('encodes each segment of the key', () => {
    expect(s3Url({ bucket: 'backups', endpoint: AWS, key: 'my logs/the log.txt' }))
      .toEqual('https://backups.s3.us-east-1.amazonaws.com/my%20logs/the%20log.txt')
  })
})
