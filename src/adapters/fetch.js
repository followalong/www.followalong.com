import FetchError from './fetch-error.js'

// A feed that has not changed answers 304 with no body, which is the whole
// point of sending the validators: a poll that costs a few hundred bytes
// instead of the whole feed.
const NOT_MODIFIED = 304

const conditionalHeaders = ({ etag, lastModified }) => {
  const headers = {}

  if (etag) headers['If-None-Match'] = etag
  if (lastModified) headers['If-Modified-Since'] = lastModified

  return headers
}

// `impl` is window.fetch in the app and a stub in the specs.
const buildFetch = (impl) => (url, options = {}) => {
  return impl(url, { headers: conditionalHeaders(options) })
    .then((response) => {
      if (!response.ok && response.status !== NOT_MODIFIED) {
        throw new FetchError(response.status, url)
      }

      if (response.status === NOT_MODIFIED) {
        return { status: NOT_MODIFIED, body: '' }
      }

      return response.text().then((body) => ({
        status: response.status,
        body,
        etag: response.headers.get('etag') || undefined,
        lastModified: response.headers.get('last-modified') || undefined
      }))
    })
}

export default buildFetch
