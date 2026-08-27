import { hostFor } from './fetch-error.js'

// Deliberately not a FetchError. That one carries the status a server
// answered with and earns the backoff that doubles towards a day; nothing
// answered here, so this is a host we could not reach and has to be
// indistinguishable from one — including to
// releaseUnrefusedFailuresForIdentity, which forgives exactly these.
class TimeoutError extends Error {
  constructor (url, ms) {
    super(`${hostFor(url)} did not answer in time (${Math.round(ms / 1000)}s)`)

    this.name = 'TimeoutError'
    this.url = url
  }
}

export default TimeoutError
