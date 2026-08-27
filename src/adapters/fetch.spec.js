import { describe, test, expect, vi, afterEach } from 'vitest'
import buildFetch, { TIMEOUT_MS } from './fetch.js'
import FetchError from './fetch-error.js'

const response = ({ status = 200, body = '<rss/>', headers = {} }) => ({
  ok: status >= 200 && status < 300,
  status,
  text: () => Promise.resolve(body),
  headers: { get: (name) => headers[name.toLowerCase()] ?? null }
})

const fetchWith = (impl) => buildFetch(impl)

describe('fetch', () => {
  test('resolves the body of a good response', async () => {
    const fetch = fetchWith(() => Promise.resolve(response({ body: '<rss>hi</rss>' })))

    expect(await fetch('https://a.example/feed')).toMatchObject({ status: 200, body: '<rss>hi</rss>' })
  })

  test('rejects an error status rather than returning its body', async () => {
    const fetch = fetchWith(() => Promise.resolve(response({ status: 403, body: '' })))

    await expect(fetch('https://world.hey.com/dhh/feed.atom')).rejects.toThrow(FetchError)
    await expect(fetch('https://world.hey.com/dhh/feed.atom')).rejects.toThrow('403')
  })

  test('returns the validators a conditional request needs next time', async () => {
    const fetch = fetchWith(() => Promise.resolve(response({
      headers: { etag: '"abc"', 'last-modified': 'Mon, 01 May 2023 00:00:00 GMT' }
    })))

    expect(await fetch('https://a.example/feed')).toMatchObject({
      etag: '"abc"',
      lastModified: 'Mon, 01 May 2023 00:00:00 GMT'
    })
  })

  test('treats 304 as success with no body', async () => {
    const fetch = fetchWith(() => Promise.resolve(response({ status: 304, body: '' })))

    expect(await fetch('https://a.example/feed')).toMatchObject({ status: 304, body: '' })
  })

  test('sends the conditional headers it is given', async () => {
    let seen = null
    const fetch = fetchWith((url, options) => {
      seen = options
      return Promise.resolve(response({}))
    })

    await fetch('https://a.example/feed', { etag: '"abc"', lastModified: 'Mon, 01 May 2023 00:00:00 GMT' })

    expect(seen.headers['If-None-Match']).toEqual('"abc"')
    expect(seen.headers['If-Modified-Since']).toEqual('Mon, 01 May 2023 00:00:00 GMT')
  })

  // One hung request used to stop everything: the sweep fetches in series and
  // reschedules itself inside the .then that never ran, so polling stopped
  // until the app was reloaded.
  describe('when the request never answers', () => {
    afterEach(() => vi.useRealTimers())

    const hangs = () => {
      vi.useFakeTimers()

      const seen = []
      const fetch = fetchWith((url, options) => {
        seen.push(options)
        return new Promise(() => {})
      })

      return { seen, result: fetch('https://a.example/feed') }
    }

    test('gives up rather than waiting forever', async () => {
      const { result } = hangs()
      const rejects = expect(result).rejects.toThrow(/did not answer/)

      vi.advanceTimersByTime(TIMEOUT_MS)

      await rejects
    })

    // A refusal carries the status the server answered with and earns a
    // backoff that doubles towards a day. Nothing answered here, so this is
    // the other kind of failure and must not be told apart from one.
    test('reports no status, because no response ever came back', async () => {
      const { result } = hangs()
      const caught = result.catch((e) => e)

      vi.advanceTimersByTime(TIMEOUT_MS)

      const error = await caught

      expect(error).not.toBeInstanceOf(FetchError)
      expect(error.status).toBeUndefined()
    })

    test('lets go of the request it gave up on', async () => {
      const { seen, result } = hangs()
      const caught = result.catch(() => {})

      expect(seen[0].signal.aborted).toEqual(false)

      vi.advanceTimersByTime(TIMEOUT_MS)
      await caught

      expect(seen[0].signal.aborted).toEqual(true)
    })

    test('leaves a request that answers alone', async () => {
      vi.useFakeTimers()

      const fetch = fetchWith(() => Promise.resolve(response({ body: '<rss>hi</rss>' })))
      const answered = await fetch('https://a.example/feed')

      expect(answered.body).toEqual('<rss>hi</rss>')
      expect(vi.getTimerCount()).toEqual(0)
    })
  })

  test('sends no conditional headers without validators', async () => {
    let seen = null
    const fetch = fetchWith((url, options) => {
      seen = options
      return Promise.resolve(response({}))
    })

    await fetch('https://a.example/feed')

    expect(seen.headers).toEqual({})
  })
})
