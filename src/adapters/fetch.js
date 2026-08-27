import FetchError from './fetch-error.js'
import TimeoutError from './timeout-error.js'

// A feed that has not changed answers 304 with no body, which is the whole
// point of sending the validators: a poll that costs a few hundred bytes
// instead of the whole feed.
const NOT_MODIFIED = 304

// Long enough that a feed which is going to answer has, over two hops — the
// browser asks the proxy and the proxy asks the origin — and short enough
// that a hung one costs a single sweep rather than every sweep after it.
// A poll fetches in series and reschedules itself once the last one is done,
// so without a limit here one request that never answers stops polling
// altogether until the app is reloaded.
const TIMEOUT_MS = 20000

const conditionalHeaders = ({ etag, lastModified }) => {
  const headers = {}

  if (etag) headers['If-None-Match'] = etag
  if (lastModified) headers['If-Modified-Since'] = lastModified

  return headers
}

// `impl` is window.fetch in the app and a stub in the specs.
const buildFetch = (impl, timeoutMs = TIMEOUT_MS) => (url, options = {}) => {
  const controller = new AbortController()
  let timer

  const givenUp = new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      // Abort as well as reject: the rejection frees the sweep, the abort
      // frees the connection the sweep is no longer waiting on.
      controller.abort()
      reject(new TimeoutError(url, timeoutMs))
    }, timeoutMs)
  })

  const asked = impl(url, { headers: conditionalHeaders(options), signal: controller.signal })

  return Promise.race([asked, givenUp])
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
    .finally(() => clearTimeout(timer))
}

export { TIMEOUT_MS }
export default buildFetch
