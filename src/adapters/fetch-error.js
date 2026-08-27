// A feed that answers with an error status is a failure, not an empty feed.
// Without this the body of a 403 was handed to the XML parser, parsed to
// nothing, and recorded as a successful fetch of a feed with no entries.
const hostFor = (url) => {
  try {
    return new URL(url).host
  } catch (e) {
    return url
  }
}

class FetchError extends Error {
  constructor (status, url) {
    super(`${hostFor(url)} refused the request (${status})`)

    this.name = 'FetchError'
    this.status = status
    this.url = url
  }
}

export { hostFor }
export default FetchError
