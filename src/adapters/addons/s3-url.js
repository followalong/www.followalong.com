// Whether a bucket may be a hostname label. The same test aws-sdk v2 applied,
// kept to the letter: it decided the URLs every configured bucket is already
// answering, so a stricter or looser rule here silently moves people's data
// to an address their storage does not serve.
const DNS_COMPATIBLE = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/
const IP_ADDRESS = /(\d+\.){3}\d+/
const DOUBLE_DOT = /\.\./
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i
const STRIP_SLASHES = /^\/|\/$/g

const dnsCompatible = (bucket) => {
  return DNS_COMPATIBLE.test(bucket) && !IP_ADDRESS.test(bucket) && !DOUBLE_DOT.test(bucket)
}

// A bucket goes in the host unless it cannot: a name that is not a legal
// hostname has nowhere else to go, and a name with a dot in it would need a
// certificate covering two labels, which the wildcard ones do not.
const inThePath = (bucket, secure) => {
  if (!dnsCompatible(bucket)) return true

  return secure && bucket.indexOf('.') !== -1
}

// The browser encodes a path on its way out, and the signature is computed
// over what is sent, so anything that would be rewritten has to be rewritten
// before it is signed.
const encodeKey = (key) => {
  return `${key}`
    .replace(STRIP_SLASHES, '')
    .split('/')
    .map(encodeURIComponent)
    .join('/')
}

const s3Url = ({ bucket, endpoint, key }) => {
  const url = new URL(HAS_SCHEME.test(endpoint) ? endpoint : `https://${endpoint}`)
  const secure = url.protocol === 'https:'
  const path = encodeKey(key)

  if (inThePath(bucket, secure)) {
    return `${url.protocol}//${url.host}/${bucket}/${path}`
  }

  return `${url.protocol}//${bucket}.${url.host}/${path}`
}

export { dnsCompatible }
export default s3Url
